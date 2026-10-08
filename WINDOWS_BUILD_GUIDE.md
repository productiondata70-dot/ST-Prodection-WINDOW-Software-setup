# ST Production and Stock Manager — Windows Software & GitHub Guide

This guide explains how to build, run, package, and maintain the Windows Desktop Software and Web Browser application from this GitHub repository.

---

## 1. System Requirements

- **Operating System:** Windows 10 / Windows 11 (64-bit)
- **Node.js:** v18.x or v20.x+ (Recommended: Node.js 20 LTS)
- **Package Manager:** npm (v9+)
- **Modern Web Browsers (For Browser Mode):**
  - Google Chrome (Latest)
  - Microsoft Edge (Latest)
  - Mozilla Firefox (Latest)
  - Opera, Brave, or any Chromium-based browser

---

## 2. Windows Desktop Software Architecture

The desktop application is built with a high-performance **React 19 + TypeScript + Vite + Electron** architecture:

- **Desktop Shell:** Electron runtime (`electron/main.cjs` & `electron/preload.cjs`) with native Windows window management.
- **Core Business Engine:** Persistent local storage engine (`src/services/storage.ts`) with continuous real-time backup delta checks.
- **Cloud Synchronization:** Google Drive REST API v3 with official Google OAuth 2.0 (`src/services/googleDrive.ts`) and Firebase Firestore live replication (`src/services/firebase.ts`).
- **Reports Engine:** Client-side vector PDF generation (`jspdf` + `jspdf-autotable`) and thermal receipt generation.

Both the Windows Desktop application and the Web Browser version use the exact same business logic, authentication system, calculations, and data persistence layer.

---

## 3. Clone and Setup from GitHub

```bash
# Clone the repository
git clone https://github.com/your-username/st-production-and-stock-manager.git

# Enter the project directory
cd st-production-and-stock-manager

# Install dependencies
npm install
```

---

## 4. Running the Application

### Option A: Running in Modern Web Browsers
To run the web browser version locally:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`. Works identically across **Google Chrome**, **Microsoft Edge**, and **Mozilla Firefox**.

### Option B: Running Windows Desktop in Development
```bash
# Terminal 1: Start local dev server
npm run dev

# Terminal 2: Launch Electron Windows desktop wrapper
npx electron .
```

---

## 5. Building the Windows Software Executable (.exe)

### Method A: One-Click in Windsurf / VS Code (Easiest)
1. Open the project folder in **Windsurf**.
2. Press **`Ctrl+Shift+B`** (or press `Ctrl+Shift+P` -> `Tasks: Run Build Task`).
3. Select **`Build Windows EXE (Installer & Portable)`**.
4. Or in the Windsurf Cascade chat, simply ask: *"Build the exe file"* — Cascade will automatically read `.windsurfrules` and generate the binaries.

### Method B: Double-Click Batch Script (Windows Explorer)
Double-click `build-windows.bat` in the project root folder. It will check your environment, install dependencies, package the executables, and automatically open the `release\` folder!

### Method C: Terminal Command (npm / PowerShell)
```bash
# Single command to build and package both NSIS installer & portable .exe:
npm run package:win
```

### Build Output
The packaged software will be located in the `/release` folder:
1. `ST Production and Stock Manager-Setup-1.0.0.exe` — Full Windows installer with desktop shortcut and start menu integration.
2. `ST Production and Stock Manager-Portable-1.0.0.exe` — Portable Windows executable that runs without installation (ideal for USB drives and factory workstations).

---

## 6. GitHub Actions Automated Builds & Automatic Windows Update Workflow

The repository includes a pre-configured GitHub Actions workflow in `.github/workflows/windows-build.yml` and an integrated automatic update engine (`electron/main.cjs` + `src/services/updater.ts`).

### How to Release a New Version Update:
1. Update the application in Google AI Studio.
2. Increment the single authoritative version in `package.json` (for example, `"version": "1.1.0"`).
3. Push the updated code to your GitHub repository (`main` branch or tag `v1.1.0`).
4. GitHub Actions automatically:
   - Reads the authoritative version from `package.json`
   - Compiles the Vite bundle and packages the Windows NSIS Setup installer (`.exe`), portable executable, and update metadata (`latest.yml` & `.blockmap`)
   - Publishes a GitHub Release (`v1.1.0`) containing the Windows installer package
5. Existing installed Windows applications check GitHub Releases on startup (or when clicking **Check for Updates** in the **About** section):
   - Displays **Update Available: v1.1.0**
   - Clicking **Download & Install Update** safely backs up all local mill data (`%APPDATA%\ST Production and Stock Manager`), downloads the new installer with a live progress bar, installs the update in place, and restarts the application on the latest version with 100% of existing data preserved.

---

## 7. Security & Environment Configuration

### CRITICAL Security Rule — Never Commit Credentials
The `.gitignore` file is pre-configured to exclude sensitive keys:
- Firebase Service Account private keys (`*.pem`, `serviceAccountKey.json`)
- Google OAuth Client Secrets
- Administrator Passwords & Permission PINs
- Google Refresh Tokens & API private keys

All application secrets must be supplied via local `.env` file (copied from `.env.example`).

---

## 8. Master Features & Workflows

### A. History & Audit Select + Delete
1. Navigate to **History & Audit** in the navigation sidebar.
2. Click the **Select** button in the top action bar to enter selection mode.
3. Select individual records or check the header box to select all visible records in the current tab (Production Shifts, Sales, Stock Movements, Returns, Waste, or Audit Trail).
4. Click **Delete Selected (N)**.
5. In the confirmation dialog, review the selected records. Deleting history records removes them from the History view while **guaranteeing** that underlying production records, stock ledger balances, sales invoices, products, and mill business profiles remain 100% intact. Compliance security logs are safeguarded.
6. Click **Confirm Delete Selected**.

### B. Google Drive Cloud Sync & Account Change
1. Navigate to **Admin Panel** → **Google Drive & Cloud Sync**.
2. Click **Connect Google Drive** to authorize via official Google OAuth.
3. To switch accounts (e.g. to `productiondata70@gmail.com`):
   - Click **Change Google Account**.
   - Review the safety confirmation modal.
   - Authorize `productiondata70@gmail.com` via the official Google sign-in window.
   - Upon verification, the UI updates to:
     `Google Drive: Connected`
     `Connected Account: productiondata70@gmail.com`
   - Future delta backups and disaster recovery snapshots will automatically use this verified account.
