// @ts-check
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

// Authoritative version from package.json
const pkgPath = path.join(__dirname, '../package.json');
let AUTHORITATIVE_VERSION = '1.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  if (pkg && pkg.version) {
    AUTHORITATIVE_VERSION = String(pkg.version).trim();
  }
} catch (err) {
  console.warn('Could not read package.json version, falling back to app.getVersion():', err);
  AUTHORITATIVE_VERSION = app.getVersion() || '1.0.0';
}

const DEFAULT_GITHUB_OWNER = 'tanzeelapp';
const DEFAULT_GITHUB_REPO = 'finl-pc-st-prodection';

let mainWindow = null;
let lastDownloadedInstallerPath = null;
let isDownloadingUpdate = false;

// Optional electron-updater integration when running packaged NSIS build
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  if (autoUpdater) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
  }
} catch {
  // Fallback to built-in GitHub Release HTTPS updater
  autoUpdater = null;
}

/**
 * Normalize version string (e.g. "v1.1.0" -> "1.1.0")
 * @param {string} v
 */
function normalizeVersion(v) {
  return String(v || '')
    .trim()
    .replace(/^[vV]+/, '');
}

/**
 * Semantic version comparison:
 * Returns 1 if vA > vB, -1 if vA < vB, 0 if equal
 * @param {string} vA
 * @param {string} vB
 */
function compareSemver(vA, vB) {
  const cleanA = normalizeVersion(vA).split('-')[0];
  const cleanB = normalizeVersion(vB).split('-')[0];
  const partsA = cleanA.split('.').map(n => parseInt(n, 10) || 0);
  const partsB = cleanB.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length, 3);
  for (let i = 0; i < len; i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Send update event to renderer process safely
 * @param {string} channel
 * @param {any} payload
 */
function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, payload);
  }
}

/**
 * Persistent UserData file paths (located in %APPDATA%/ST Production and Stock Manager,
 * completely separate from the application installation folder so updates never erase data)
 */
function getUserDataDbPath() {
  return path.join(app.getPath('userData'), 'st_mill_database_v5.json');
}

function getPreUpdateBackupPath() {
  return path.join(app.getPath('userData'), 'pre_update_backup.json');
}

/**
 * Atomically write JSON string to disk in %APPDATA%
 * @param {string} filePath
 * @param {string} content
 */
function writeAtomicFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, content, 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Perform HTTPS GET request returning parsed JSON (follows redirects)
 * @param {string} url
 * @returns {Promise<{ statusCode: number, data: any }>}
 */
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': `ST-Production-and-Stock-Manager/${AUTHORITATIVE_VERSION}`,
          Accept: 'application/vnd.github+json',
        },
        timeout: 15000,
      },
      res => {
        const statusCode = res.statusCode || 0;
        if (
          (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) &&
          res.headers.location
        ) {
          httpsGetJson(res.headers.location).then(resolve).catch(reject);
          return;
        }

        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            resolve({ statusCode, data: parsed });
          } catch (e) {
            resolve({ statusCode, data: null });
          }
        });
      }
    );

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out while checking for updates.'));
    });
  });
}

/**
 * Download binary file over HTTPS with redirect handling and real-time progress reporting
 * @param {string} url
 * @param {string} destPath
 * @param {(progress: { percent: number, transferredBytes: number, totalBytes: number, bytesPerSecond: number }) => void} onProgress
 * @returns {Promise<string>}
 */
function downloadFileWithProgress(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempDestPath = `${destPath}.part`;

    const startRequest = currentUrl => {
      const req = https.get(
        currentUrl,
        {
          headers: {
            'User-Agent': `ST-Production-and-Stock-Manager/${AUTHORITATIVE_VERSION}`,
            Accept: 'application/octet-stream, */*',
          },
          timeout: 30000,
        },
        res => {
          const statusCode = res.statusCode || 0;
          if (
            (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) &&
            res.headers.location
          ) {
            startRequest(res.headers.location);
            return;
          }

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Update package download failed (HTTP ${statusCode}).`));
            return;
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || 0;
          let transferredBytes = 0;
          const startTime = Date.now();
          const fileStream = fs.createWriteStream(tempDestPath);

          res.on('data', chunk => {
            transferredBytes += chunk.length;
            const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.1);
            const bytesPerSecond = Math.round(transferredBytes / elapsedSec);
            const percent =
              totalBytes > 0
                ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100))
                : 0;

            onProgress({
              percent,
              transferredBytes,
              totalBytes,
              bytesPerSecond,
            });
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              try {
                // Verify downloaded file is non-empty
                const stat = fs.statSync(tempDestPath);
                if (!stat || stat.size < 1024) {
                  reject(new Error('Downloaded update file is incomplete or corrupted.'));
                  return;
                }
                if (fs.existsSync(destPath)) {
                  fs.unlinkSync(destPath);
                }
                fs.renameSync(tempDestPath, destPath);
                resolve(destPath);
              } catch (err) {
                reject(err);
              }
            });
          });

          fileStream.on('error', err => {
            try {
              if (fs.existsSync(tempDestPath)) fs.unlinkSync(tempDestPath);
            } catch {}
            reject(err);
          });
        }
      );

      req.on('error', err => {
        try {
          if (fs.existsSync(tempDestPath)) fs.unlinkSync(tempDestPath);
        } catch {}
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy(new Error('Connection timed out during update download.'));
      });
    };

    startRequest(url);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'ST Production and Stock Manager',
    backgroundColor: '#F8FAFC',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Gracefully show window when ready to avoid visual flickering
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Handle external link clicks (open in default system web browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a Google OAuth flow or external doc, open safely
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Development vs Production loading
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    // In production build, load the bundled Vite dist index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load local HTML bundle:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// ============================================================================
// Persistent UserData Database Storage IPC Handlers (Data Preservation Guarantee)
// ============================================================================

ipcMain.handle('storage:save-user-data', async (_event, serializedDb) => {
  try {
    if (typeof serializedDb === 'string' && serializedDb.length > 10) {
      writeAtomicFile(getUserDataDbPath(), serializedDb);
      return { success: true, path: getUserDataDbPath() };
    }
    return { success: false, error: 'Invalid database payload' };
  } catch (err) {
    console.warn('Failed to write persistent userData backup:', err);
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
});

ipcMain.handle('storage:load-user-data', async () => {
  try {
    const dbPath = getUserDataDbPath();
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf-8');
      return { success: true, data: content, path: dbPath };
    }
    const preUpdatePath = getPreUpdateBackupPath();
    if (fs.existsSync(preUpdatePath)) {
      const content = fs.readFileSync(preUpdatePath, 'utf-8');
      return { success: true, data: content, path: preUpdatePath };
    }
    return { success: true, data: null };
  } catch (err) {
    console.warn('Failed to load persistent userData backup:', err);
    return { success: false, data: null };
  }
});

// ============================================================================
// Automatic Update System IPC Handlers
// ============================================================================

ipcMain.handle('updater:get-info', async () => {
  return {
    currentVersion: AUTHORITATIVE_VERSION,
    platform: process.platform,
    isPackaged: app.isPackaged,
    userDataPath: app.getPath('userData'),
    repo: {
      owner: DEFAULT_GITHUB_OWNER,
      repo: DEFAULT_GITHUB_REPO,
    },
  };
});

ipcMain.handle('updater:check', async (_event, options = {}) => {
  const owner = (options && options.owner) || DEFAULT_GITHUB_OWNER;
  const repo = (options && options.repo) || DEFAULT_GITHUB_REPO;
  const currentVersion = AUTHORITATIVE_VERSION;

  sendToRenderer('updater:status', {
    status: 'checking',
    currentVersion,
  });

  try {
    // 1. Query GitHub Releases API (/releases/latest first, then /releases list)
    let releaseData = null;
    const latestUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`;
    const latestRes = await httpsGetJson(latestUrl);

    if (latestRes.statusCode === 200 && latestRes.data && latestRes.data.tag_name) {
      releaseData = latestRes.data;
    } else if (latestRes.statusCode === 404) {
      // Check /releases array in case releases are marked pre-release or no releases exist yet
      const listUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=5`;
      const listRes = await httpsGetJson(listUrl);
      if (listRes.statusCode === 200 && Array.isArray(listRes.data)) {
        if (listRes.data.length === 0) {
          // Repository exists and is reachable, but no newer release has been published yet
          const upToDateResult = {
            status: 'up-to-date',
            currentVersion,
            latestVersion: currentVersion,
            updateAvailable: false,
            checkedAt: new Date().toISOString(),
          };
          sendToRenderer('updater:status', upToDateResult);
          return upToDateResult;
        }
        releaseData = listRes.data.find(r => !r.draft && r.tag_name) || null;
      } else if (listRes.statusCode === 404) {
        // Repository has no public releases yet; treat current version as up-to-date
        const upToDateResult = {
          status: 'up-to-date',
          currentVersion,
          latestVersion: currentVersion,
          updateAvailable: false,
          checkedAt: new Date().toISOString(),
        };
        sendToRenderer('updater:status', upToDateResult);
        return upToDateResult;
      }
    } else if (latestRes.statusCode >= 400) {
      throw new Error(`GitHub Release check returned HTTP ${latestRes.statusCode}.`);
    }

    if (!releaseData || !releaseData.tag_name) {
      const upToDateResult = {
        status: 'up-to-date',
        currentVersion,
        latestVersion: currentVersion,
        updateAvailable: false,
        checkedAt: new Date().toISOString(),
      };
      sendToRenderer('updater:status', upToDateResult);
      return upToDateResult;
    }

    const latestVersion = normalizeVersion(releaseData.tag_name);
    const isNewer = compareSemver(latestVersion, currentVersion) > 0;

    // Locate Windows installer (.exe) in release assets
    const assets = Array.isArray(releaseData.assets) ? releaseData.assets : [];
    const setupExeAsset =
      assets.find(
        a =>
          a &&
          typeof a.name === 'string' &&
          a.name.toLowerCase().endsWith('.exe') &&
          a.name.toLowerCase().includes('setup')
      ) ||
      assets.find(
        a => a && typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe')
      ) ||
      null;

    const result = {
      status: isNewer ? 'available' : 'up-to-date',
      currentVersion,
      latestVersion,
      updateAvailable: isNewer,
      releaseName: releaseData.name || `v${latestVersion}`,
      releaseNotes: releaseData.body || '',
      publishedAt: releaseData.published_at || new Date().toISOString(),
      htmlUrl: releaseData.html_url || `https://github.com/${owner}/${repo}/releases`,
      downloadUrl: setupExeAsset ? setupExeAsset.browser_download_url : null,
      assetName: setupExeAsset
        ? setupExeAsset.name
        : `ST Production and Stock Manager-Setup-${latestVersion}.exe`,
      assetSize: setupExeAsset ? setupExeAsset.size || 0 : 0,
      checkedAt: new Date().toISOString(),
    };

    sendToRenderer('updater:status', result);
    return result;
  } catch (err) {
    const errorMessage =
      err && err.message
        ? err.message
        : 'Unable to check for updates. Please verify your internet connection.';
    const errorResult = {
      status: 'error',
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
      error: errorMessage,
      checkedAt: new Date().toISOString(),
    };
    sendToRenderer('updater:status', errorResult);
    return errorResult;
  }
});

ipcMain.handle('updater:download', async (_event, payload = {}) => {
  if (isDownloadingUpdate) {
    return { success: false, error: 'An update download is already in progress.' };
  }

  const { downloadUrl, assetName, version, dbSnapshot } = payload;
  if (!downloadUrl) {
    return {
      success: false,
      error: 'No Windows installer (.exe) package was found attached to this GitHub Release.',
    };
  }

  isDownloadingUpdate = true;
  try {
    // 1. Save pre-update database backup in %APPDATA% before downloading
    if (typeof dbSnapshot === 'string' && dbSnapshot.length > 10) {
      try {
        writeAtomicFile(getUserDataDbPath(), dbSnapshot);
        writeAtomicFile(getPreUpdateBackupPath(), dbSnapshot);
      } catch (backupErr) {
        console.warn('Pre-update backup warning:', backupErr);
      }
    }

    const safeFileName = (
      assetName || `ST-Production-and-Stock-Manager-Setup-${version || 'latest'}.exe`
    ).replace(/[^a-zA-Z0-9._ -]/g, '_');

    const updateDir = path.join(app.getPath('temp'), 'st-production-updates');
    const targetPath = path.join(updateDir, safeFileName);

    sendToRenderer('updater:status', {
      status: 'downloading',
      currentVersion: AUTHORITATIVE_VERSION,
      latestVersion: version || AUTHORITATIVE_VERSION,
      updateAvailable: true,
    });

    const downloadedPath = await downloadFileWithProgress(
      downloadUrl,
      targetPath,
      progress => {
        sendToRenderer('updater:progress', progress);
      }
    );

    lastDownloadedInstallerPath = downloadedPath;
    isDownloadingUpdate = false;

    sendToRenderer('updater:status', {
      status: 'downloaded',
      currentVersion: AUTHORITATIVE_VERSION,
      latestVersion: version || AUTHORITATIVE_VERSION,
      updateAvailable: true,
      downloadedFilePath: downloadedPath,
    });

    return {
      success: true,
      filePath: downloadedPath,
      version,
    };
  } catch (err) {
    isDownloadingUpdate = false;
    const errorMessage =
      err && err.message ? err.message : 'Failed to download Windows update package.';
    sendToRenderer('updater:status', {
      status: 'error',
      currentVersion: AUTHORITATIVE_VERSION,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
});

ipcMain.handle('updater:install', async (_event, payload = {}) => {
  try {
    const installerPath = (payload && payload.filePath) || lastDownloadedInstallerPath;
    const dbSnapshot = payload && payload.dbSnapshot;

    // 1. Guarantee local database & user settings are flushed to %APPDATA% before closing
    if (typeof dbSnapshot === 'string' && dbSnapshot.length > 10) {
      writeAtomicFile(getUserDataDbPath(), dbSnapshot);
      writeAtomicFile(getPreUpdateBackupPath(), dbSnapshot);
    }

    if (!installerPath || !fs.existsSync(installerPath)) {
      return {
        success: false,
        error: 'Downloaded installer file was not found. Please download the update again.',
      };
    }

    sendToRenderer('updater:status', {
      status: 'installing',
      currentVersion: AUTHORITATIVE_VERSION,
    });

    // 2. Launch the downloaded Windows NSIS/Setup executable in a detached process
    const child = spawn(installerPath, ['--updated'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    // 3. Gracefully quit the current application so the installer replaces the binary and restarts
    setTimeout(() => {
      app.quit();
    }, 450);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err && err.message ? err.message : 'Failed to launch Windows update installer.',
    };
  }
});

// ============================================================================
// Thermal Printer & Barcode Label Printing IPC Handlers
// ============================================================================

ipcMain.handle('printer:list', async () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) {
      return { success: false, printers: [], error: 'Main window is not ready.' };
    }
    const printers = await mainWindow.webContents.getPrintersAsync();
    const formatted = (printers || []).map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || '',
      status: p.status ?? 0,
      isDefault: Boolean(p.isDefault),
    }));
    return { success: true, printers: formatted };
  } catch (err) {
    return {
      success: false,
      printers: [],
      error: err && err.message ? err.message : 'Failed to query system printers.',
    };
  }
});

ipcMain.handle('printer:print-html', async (_event, payload = {}) => {
  const { htmlContent, deviceName, silent = false, paperWidthMm = 58 } = payload || {};
  if (!htmlContent || typeof htmlContent !== 'string') {
    return { success: false, error: 'Empty receipt or label document content.' };
  }

  let printWin = null;
  try {
    // Verify printer exists if a specific deviceName is requested
    if (deviceName && mainWindow && !mainWindow.isDestroyed()) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const matched = (printers || []).find(
        p => p.name === deviceName || p.displayName === deviceName
      );
      if (!matched) {
        return {
          success: false,
          error: `Selected printer "${deviceName}" was not found or is disconnected. Please verify the printer connection in Settings.`,
        };
      }
    }

    const widthPx = paperWidthMm === 58 ? 220 : paperWidthMm === 80 ? 302 : 380;
    printWin = new BrowserWindow({
      width: widthPx,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    await printWin.loadURL(dataUrl);

    // Wait briefly for fonts/SVG barcodes to settle
    await new Promise(resolve => setTimeout(resolve, 250));

    const printResult = await new Promise(resolve => {
      const printOptions = {
        silent: Boolean(silent && deviceName),
        printBackground: true,
        deviceName: deviceName || undefined,
        margins: { marginType: 'none' },
      };

      printWin.webContents.print(printOptions, (success, failureReason) => {
        if (!success) {
          resolve({
            success: false,
            error:
              failureReason === 'cancelled'
                ? 'Print job was cancelled by user.'
                : `Printer error: ${failureReason || 'Unable to access printer or driver.'}`,
          });
        } else {
          resolve({ success: true });
        }
      });
    });

    return printResult;
  } catch (err) {
    return {
      success: false,
      error: err && err.message ? err.message : 'Thermal print job failed.',
    };
  } finally {
    if (printWin && !printWin.isDestroyed()) {
      printWin.close();
    }
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
