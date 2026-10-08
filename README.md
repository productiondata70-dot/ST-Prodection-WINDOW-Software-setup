# ST Production and Stock Manager

A professional enterprise management system for flour mills and processing facilities. Built with React 19, TypeScript, Tailwind CSS, Vite, and Electron for Windows desktop application and modern web browsers.

## 🚀 Features

- **Production Tracking**: Bagging shifts, operator logs, and material consumption.
- **Stock & Inventory**: Real-time stock counts, multi-batch valuation, automatic pricing locking.
- **Mill/Factory Purchases**: Dedicated material procurement with inward tracking.
- **Sales & Dispatches**: Automated pricing retrieval with locked rates, editable discounts displayed in both percentage (%) and PKR, invoice generation and printing.
- **Customer Returns & Reconditioning**: Track returned goods, rework, and waste recycling.
- **History & Audit**: Real-time audit logs, complete traceability, with batch selection and safe removal of non-critical records while preserving immutable audit logs.
- **Cloud & Backup**: Dual synchronization via Firebase/Firestore and Google Drive automated backups.
- **Multi-Role Security**: Admin, Supervisor, Operator, and Auditor roles with dedicated permissions.

---

## 💻 Running the Application

### 1. In Modern Web Browsers
The application is fully compatible with Google Chrome, Microsoft Edge, Mozilla Firefox, and all modern Chromium browsers.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

### 2. Building Windows Desktop Software (.exe) in Windsurf / Local Windows Machine

See the dedicated [Windsurf Guide (WINDSURF_EXE_GUIDE.md)](./WINDSURF_EXE_GUIDE.md) for full instructions.

To generate the Windows desktop installation file (`.exe`) in Windsurf or on any Windows computer:

```bash
# 1. Install dependencies
npm install

# 2. Package the Windows Installer & Portable .exe
npm run package:win
# or
npm run build:exe
```

The output Windows executables will be located in the `release/` directory:
- `ST Production and Stock Manager-Setup-1.0.0.exe` (NSIS Installer with desktop and start menu shortcuts)
- `ST Production and Stock Manager-Portable-1.0.0.exe` (Standalone portable executable)

### 3. Automated Windows Builds via GitHub Actions
A ready-to-run GitHub workflow is included in `.github/workflows/windows-build.yml`. Simply push your repository to GitHub, and the build action will automatically compile and produce download links for the Windows `.exe` installer.

---

## ☁️ Google Drive Account Configuration
To change or reconnect the authorized Google Drive backup account:
1. Navigate to **Admin Panel** > **Google Drive Cloud Sync**.
2. Click **Change Google Account**.
3. Confirm the action to safely de-link the previous token without touching local database records or cloud archives.
4. Sign in with the target Google account (e.g., `productiondata70@gmail.com`).
