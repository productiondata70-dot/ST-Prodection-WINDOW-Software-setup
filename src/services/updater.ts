import pkg from '../../package.json';

declare const __APP_VERSION__: string | undefined;

export interface DesktopUpdaterAPI {
  isDesktop?: boolean;
  platform?: string;
  version?: string;
  minimizeWindow?: () => void;
  maximizeWindow?: () => void;
  closeWindow?: () => void;
  saveUserData?: (serializedDb: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadUserData?: () => Promise<{ success: boolean; data: string | null; path?: string }>;
  getUpdaterInfo?: () => Promise<{
    currentVersion: string;
    platform: string;
    isPackaged: boolean;
    userDataPath: string;
    repo: { owner: string; repo: string };
  }>;
  checkForUpdates?: (options?: { owner?: string; repo?: string }) => Promise< any >;
  downloadUpdate?: (payload: {
    downloadUrl: string | null;
    assetName: string;
    version: string;
    dbSnapshot?: string;
  }) => Promise<{ success: boolean; filePath?: string; version?: string; error?: string }>;
  installUpdate?: (payload: {
    filePath?: string | null;
    dbSnapshot?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onUpdaterStatus?: (callback: (data: any) => void) => () => void;
  onUpdaterProgress?: (callback: (data: UpdateProgress) => void) => () => void;
  getPrinters?: () => Promise<{
    success: boolean;
    printers: Array<{
      name: string;
      displayName: string;
      description: string;
      status: number;
      isDefault: boolean;
    }>;
    error?: string;
  }>;
  printHtml?: (payload: {
    htmlContent: string;
    deviceName?: string;
    silent?: boolean;
    paperWidthMm?: 58 | 80 | 210;
  }) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    desktopAPI?: DesktopUpdaterAPI;
  }
}

/**
 * Single Authoritative Application Version
 * Sourced directly from package.json so all views, headers, and update checks stay 100% synchronized.
 */
export const APP_VERSION: string = (() => {
  if (typeof window !== 'undefined' && window.desktopAPI?.version) {
    return normalizeVersion(window.desktopAPI.version);
  }
  if (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
    return normalizeVersion(__APP_VERSION__);
  }
  return normalizeVersion(pkg.version || '1.0.0');
})();

export const DEFAULT_GITHUB_OWNER = 'tanzeelapp';
export const DEFAULT_GITHUB_REPO = 'finl-pc-st-prodection';
const REPO_STORAGE_KEY = 'st_update_github_repo_config';
const LAST_CHECK_STORAGE_KEY = 'st_update_last_checked_at';

/**
 * Strip leading 'v' or 'V' from a version string (e.g. "v1.1.0" -> "1.1.0")
 */
export function normalizeVersion(version: string): string {
  return String(version || '1.0.0')
    .trim()
    .replace(/^[vV]+/, '');
}

/**
 * Format version with leading 'v' (e.g. "1.0.0" -> "v1.0.0")
 */
export function formatVersion(version: string): string {
  const clean = normalizeVersion(version);
  return `v${clean}`;
}

/**
 * Semantic Version Comparison
 * Returns:
 *   1 if vA > vB (e.g. 1.1.0 > 1.0.0, 1.1.1 > 1.1.0, 2.0.0 > 1.9.9)
 *  -1 if vA < vB
 *   0 if vA === vB
 */
export function compareVersions(vA: string, vB: string): number {
  const cleanA = normalizeVersion(vA).split('-')[0];
  const cleanB = normalizeVersion(vB).split('-')[0];
  const partsA = cleanA.split('.').map(n => parseInt(n, 10) || 0);
  const partsB = cleanB.split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(partsA.length, partsB.length, 3);

  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export type UpdateStatusType =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

export interface UpdateProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
}

export interface UpdateState {
  status: UpdateStatusType;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string | null;
  downloadUrl: string | null;
  htmlUrl: string | null;
  assetName: string | null;
  assetSize: number;
  downloadedFilePath: string | null;
  progress: UpdateProgress;
  lastCheckedAt: string | null;
  error: string | null;
  repoOwner: string;
  repoName: string;
}

type UpdateListener = (state: UpdateState) => void;

export class UpdaterService {
  private static instance: UpdaterService;
  private state: UpdateState;
  private listeners: Set<UpdateListener> = new Set();

  private constructor() {
    const savedRepo = this.loadRepoConfig();
    const lastCheckedAt =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(LAST_CHECK_STORAGE_KEY)
        : null;

    this.state = {
      status: 'up-to-date',
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      updateAvailable: false,
      releaseName: formatVersion(APP_VERSION),
      releaseNotes: '',
      publishedAt: null,
      downloadUrl: null,
      htmlUrl: `https://github.com/${savedRepo.owner}/${savedRepo.repo}/releases`,
      assetName: null,
      assetSize: 0,
      downloadedFilePath: null,
      progress: {
        percent: 0,
        transferredBytes: 0,
        totalBytes: 0,
        bytesPerSecond: 0,
      },
      lastCheckedAt,
      error: null,
      repoOwner: savedRepo.owner,
      repoName: savedRepo.repo,
    };

    // Subscribe to Electron main process updater events if running in Windows Desktop shell
    if (typeof window !== 'undefined' && window.desktopAPI) {
      window.desktopAPI.onUpdaterProgress?.(progress => {
        this.updateState({
          status: 'downloading',
          progress: {
            percent: progress.percent ?? 0,
            transferredBytes: progress.transferredBytes ?? 0,
            totalBytes: progress.totalBytes ?? 0,
            bytesPerSecond: progress.bytesPerSecond ?? 0,
          },
        });
      });

      window.desktopAPI.onUpdaterStatus?.(statusPayload => {
        if (!statusPayload) return;
        if (statusPayload.status === 'downloading') {
          this.updateState({ status: 'downloading', error: null });
        } else if (statusPayload.status === 'downloaded') {
          this.updateState({
            status: 'downloaded',
            downloadedFilePath: statusPayload.downloadedFilePath || this.state.downloadedFilePath,
            progress: {
              ...this.state.progress,
              percent: 100,
            },
            error: null,
          });
        } else if (statusPayload.status === 'installing') {
          this.updateState({ status: 'installing', error: null });
        }
      });
    }
  }

  public static getInstance(): UpdaterService {
    if (!UpdaterService.instance) {
      UpdaterService.instance = new UpdaterService();
    }
    return UpdaterService.instance;
  }

  private loadRepoConfig(): { owner: string; repo: string } {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(REPO_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.owner && parsed.repo) {
            return {
              owner: String(parsed.owner).trim(),
              repo: String(parsed.repo).trim(),
            };
          }
        }
      }
    } catch {}
    return {
      owner: DEFAULT_GITHUB_OWNER,
      repo: DEFAULT_GITHUB_REPO,
    };
  }

  public setRepoConfig(owner: string, repo: string): void {
    const cleanOwner = String(owner || DEFAULT_GITHUB_OWNER).trim();
    const cleanRepo = String(repo || DEFAULT_GITHUB_REPO).trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        REPO_STORAGE_KEY,
        JSON.stringify({ owner: cleanOwner, repo: cleanRepo })
      );
    }
    this.updateState({
      repoOwner: cleanOwner,
      repoName: cleanRepo,
      htmlUrl: `https://github.com/${cleanOwner}/${cleanRepo}/releases`,
    });
  }

  public getState(): UpdateState {
    return { ...this.state };
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<UpdateState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  /**
   * Check GitHub Releases for a newer version of the application.
   * Uses Electron main-process updater when running as a Windows Desktop app,
   * with direct GitHub Releases REST API fallback.
   */
  public async checkForUpdates(options?: { silent?: boolean }): Promise<UpdateState> {
    const isSilent = Boolean(options?.silent);
    const { repoOwner, repoName } = this.state;
    const currentVersion = APP_VERSION;

    if (!isSilent) {
      this.updateState({
        status: 'checking',
        error: null,
      });
    }

    try {
      // 1. If running in Windows Desktop Electron environment, use main process IPC
      if (typeof window !== 'undefined' && window.desktopAPI?.checkForUpdates) {
        const ipcResult = await window.desktopAPI.checkForUpdates({
          owner: repoOwner,
          repo: repoName,
        });

        if (ipcResult && ipcResult.status !== 'error') {
          const checkedAt = ipcResult.checkedAt || new Date().toISOString();
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LAST_CHECK_STORAGE_KEY, checkedAt);
          }

          const latestVersion = normalizeVersion(ipcResult.latestVersion || currentVersion);
          const isNewer = compareVersions(latestVersion, currentVersion) > 0;

          this.updateState({
            status: isNewer ? 'available' : 'up-to-date',
            currentVersion,
            latestVersion: isNewer ? latestVersion : currentVersion,
            updateAvailable: isNewer,
            releaseName: ipcResult.releaseName || formatVersion(latestVersion),
            releaseNotes: ipcResult.releaseNotes || '',
            publishedAt: ipcResult.publishedAt || null,
            downloadUrl: ipcResult.downloadUrl || null,
            htmlUrl:
              ipcResult.htmlUrl ||
              `https://github.com/${repoOwner}/${repoName}/releases`,
            assetName:
              ipcResult.assetName ||
              `ST Production and Stock Manager-Setup-${latestVersion}.exe`,
            assetSize: ipcResult.assetSize || 0,
            lastCheckedAt: checkedAt,
            error: null,
          });
          return this.getState();
        } else if (ipcResult && ipcResult.status === 'error') {
          throw new Error(ipcResult.error || 'Unable to check for updates.');
        }
      }

      // 2. Direct GitHub Releases API check (Web Browser & Fallback)
      let releaseData: any = null;
      const latestUrl = `https://api.github.com/repos/${encodeURIComponent(
        repoOwner
      )}/${encodeURIComponent(repoName)}/releases/latest`;

      const response = await fetch(latestUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });

      if (response.ok) {
        releaseData = await response.json();
      } else if (response.status === 404) {
        // Check /releases list in case only pre-releases exist or no releases have been created yet
        const listUrl = `https://api.github.com/repos/${encodeURIComponent(
          repoOwner
        )}/${encodeURIComponent(repoName)}/releases?per_page=5`;
        const listRes = await fetch(listUrl, {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        });

        if (listRes.ok) {
          const listData = await listRes.json();
          if (Array.isArray(listData) && listData.length > 0) {
            releaseData = listData.find((r: any) => !r.draft && r.tag_name) || null;
          }
        }
      } else {
        throw new Error(`Update check failed (HTTP ${response.status}).`);
      }

      const checkedAt = new Date().toISOString();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_CHECK_STORAGE_KEY, checkedAt);
      }

      if (!releaseData || !releaseData.tag_name) {
        this.updateState({
          status: 'up-to-date',
          currentVersion,
          latestVersion: currentVersion,
          updateAvailable: false,
          lastCheckedAt: checkedAt,
          error: null,
        });
        return this.getState();
      }

      const latestVersion = normalizeVersion(releaseData.tag_name);
      const isNewer = compareVersions(latestVersion, currentVersion) > 0;

      const assets: any[] = Array.isArray(releaseData.assets) ? releaseData.assets : [];
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

      this.updateState({
        status: isNewer ? 'available' : 'up-to-date',
        currentVersion,
        latestVersion: isNewer ? latestVersion : currentVersion,
        updateAvailable: isNewer,
        releaseName: releaseData.name || formatVersion(latestVersion),
        releaseNotes: releaseData.body || '',
        publishedAt: releaseData.published_at || null,
        downloadUrl: setupExeAsset ? setupExeAsset.browser_download_url : null,
        htmlUrl:
          releaseData.html_url ||
          `https://github.com/${repoOwner}/${repoName}/releases`,
        assetName: setupExeAsset
          ? setupExeAsset.name
          : `ST Production and Stock Manager-Setup-${latestVersion}.exe`,
        assetSize: setupExeAsset ? setupExeAsset.size || 0 : 0,
        lastCheckedAt: checkedAt,
        error: null,
      });

      return this.getState();
    } catch (err: any) {
      const message =
        err && err.message
          ? err.message
          : 'Unable to check for updates. Please check your internet connection.';
      if (isSilent) {
        // Do not disrupt startup if offline
        return this.getState();
      }
      this.updateState({
        status: 'error',
        error: message,
      });
      return this.getState();
    }
  }

  /**
   * Download the latest Windows update package and safely install it.
   * Guarantees local database preservation prior to download and installation.
   */
  public async downloadAndInstallUpdate(
    dbSnapshot?: string,
    autoInstall: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    const { downloadUrl, assetName, latestVersion, htmlUrl } = this.state;

    // 1. Preserve pre-update backup in localStorage & Electron userData
    if (dbSnapshot && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('st_mill_pre_update_backup_v5', dbSnapshot);
      } catch {}
    }

    // 2. Windows Desktop Electron Native Download & Install Flow
    if (typeof window !== 'undefined' && window.desktopAPI?.downloadUpdate) {
      if (!downloadUrl) {
        const errMessage =
          'No Windows installer (.exe) file is attached to this release yet.';
        this.updateState({
          status: 'error',
          error: errMessage,
        });
        return { success: false, error: errMessage };
      }

      this.updateState({
        status: 'downloading',
        progress: {
          percent: 0,
          transferredBytes: 0,
          totalBytes: this.state.assetSize || 0,
          bytesPerSecond: 0,
        },
        error: null,
      });

      const downloadRes = await window.desktopAPI.downloadUpdate({
        downloadUrl,
        assetName:
          assetName || `ST Production and Stock Manager-Setup-${latestVersion}.exe`,
        version: latestVersion,
        dbSnapshot,
      });

      if (!downloadRes || !downloadRes.success) {
        const errMsg = downloadRes?.error || 'Failed to download update package.';
        this.updateState({
          status: 'error',
          error: errMsg,
        });
        return { success: false, error: errMsg };
      }

      this.updateState({
        status: 'downloaded',
        downloadedFilePath: downloadRes.filePath || null,
        progress: {
          ...this.state.progress,
          percent: 100,
        },
        error: null,
      });

      if (autoInstall && window.desktopAPI.installUpdate) {
        return await this.installDownloadedUpdate(dbSnapshot);
      }

      return { success: true };
    }

    // 3. Browser / Non-Electron Environment Fallback:
    // Trigger direct download of the Windows installer (.exe) from GitHub Releases
    const targetUrl = downloadUrl || htmlUrl;
    if (!targetUrl) {
      const errMessage = 'Update download URL is not available.';
      this.updateState({ status: 'error', error: errMessage });
      return { success: false, error: errMessage };
    }

    this.updateState({
      status: 'downloading',
      progress: {
        percent: 25,
        transferredBytes: 0,
        totalBytes: this.state.assetSize || 0,
        bytesPerSecond: 0,
      },
      error: null,
    });

    try {
      const anchor = document.createElement('a');
      anchor.href = targetUrl;
      anchor.download =
        assetName || `ST Production and Stock Manager-Setup-${latestVersion}.exe`;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      this.updateState({
        status: 'downloaded',
        progress: {
          percent: 100,
          transferredBytes: this.state.assetSize || 0,
          totalBytes: this.state.assetSize || 0,
          bytesPerSecond: 0,
        },
        error: null,
      });
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to initiate update package download.';
      this.updateState({ status: 'error', error: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * Install an already-downloaded update package and restart the Windows application.
   */
  public async installDownloadedUpdate(
    dbSnapshot?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (dbSnapshot && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('st_mill_pre_update_backup_v5', dbSnapshot);
      } catch {}
    }

    if (typeof window !== 'undefined' && window.desktopAPI?.installUpdate) {
      this.updateState({
        status: 'installing',
        error: null,
      });

      const res = await window.desktopAPI.installUpdate({
        filePath: this.state.downloadedFilePath,
        dbSnapshot,
      });

      if (!res || !res.success) {
        const errMsg = res?.error || 'Failed to launch Windows update installer.';
        this.updateState({
          status: 'error',
          error: errMsg,
        });
        return { success: false, error: errMsg };
      }

      return { success: true };
    }

    return {
      success: false,
      error:
        'Automatic installer execution requires running inside the Windows Desktop application. Run the downloaded Setup .exe file to complete the update.',
    };
  }
}
