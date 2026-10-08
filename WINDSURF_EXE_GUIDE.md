# Windsurf Guide — How to Build Your Windows .EXE File

This guide provides simple, foolproof instructions to open this project in **Windsurf** (by Codeium) and generate your Windows `.exe` desktop application files.

---

## ⚡ Quick 1-Minute Summary

When you open this project in Windsurf, you have **4 easy ways** to get your `.exe` files:

| Method | How to do it |
| :--- | :--- |
| **Method 1: Ask Windsurf Cascade (Easiest)** | Open the Cascade chat panel and type: <br> `Build the exe file` |
| **Method 2: One-Click Shortcut** | Press **`Ctrl + Shift + B`** (Runs the pre-configured build task) |
| **Method 3: Integrated Terminal** | Open terminal (`Ctrl + \``) and run: <br> `npm run package:win` |
| **Method 4: Windows Double-Click** | In Windows File Explorer, double-click **`build-windows.bat`** |

All methods automatically compile the project and place the generated executables into the **`release/`** folder!

---

## 📁 What Files Are Generated in `release/`?

After building, navigate to the `release/` folder to find:

1. **`ST Production and Stock Manager-Setup-1.0.0.exe`**
   - **Full Windows Installer (NSIS)**
   - Creates a Start Menu shortcut and Desktop icon.
   - Includes Windows standard Add/Remove Programs uninstaller.
   - Ideal for setting up on primary factory/office computers.

2. **`ST Production and Stock Manager-Portable-1.0.0.exe`**
   - **Portable Standalone Executable**
   - Does **not** require installation or administrator rights.
   - Can run straight from a USB pen drive, desktop folder, or shared network drive.
   - Ideal for quick deployment across multiple mill/shop workstations.

---

## 🛠️ Step-by-Step Instructions

### Step 1: Open the Project in Windsurf
1. Download or clone this repository to your Windows PC.
2. Launch **Windsurf**.
3. Click **File → Open Folder...** and select the root directory of this repository (`st-production-and-stock-manager`).

### Step 2: Ensure Node.js is Installed
The project requires Node.js (v18 or v20 LTS recommended).
To check, open the Windsurf terminal (`Ctrl + \``) and run:
```powershell
node -v
npm -v
```
*(If Node.js is not yet installed on your PC, download it from [nodejs.org](https://nodejs.org) and restart Windsurf).*

### Step 3: Install Dependencies (First Time Only)
In the Windsurf terminal:
```powershell
npm install
```
*(Windsurf Cascade or `build-windows.bat` will also do this automatically if you haven't yet).*

### Step 4: Build the `.exe`
Run any of the following commands in the Windsurf terminal:

```powershell
# Builds BOTH Setup Installer and Portable .exe:
npm run package:win

# Or use the shortcut:
npm run build:exe

# To build ONLY the Portable standalone .exe:
npm run package:win:portable

# To build ONLY the Setup Installer .exe:
npm run package:win:nsis
```

### Step 5: Test the App Locally Before Packaging (Optional)
If you want to launch the desktop app locally inside Windsurf to test before packaging:
```powershell
npm run electron:dev
```
Or to run the web browser version:
```powershell
npm run dev
```

---

## 🔒 Data Safety Guarantee

The application stores all local business data, sales invoices, stock ledgers, and mill settings in the persistent Windows UserData directory:
```
%APPDATA%\ST Production and Stock Manager\st_mill_database_v5.json
```
- Installing an update or running the portable `.exe` will **never** overwrite or delete your database.
- Database records are also automatically backed up to **Google Drive** and **Cloud Firestore** whenever connected.

---

## ❓ Troubleshooting

- **"node: command not found"**: Install Node.js LTS from [nodejs.org](https://nodejs.org) and close/reopen Windsurf.
- **PowerShell ExecutionPolicy error**: If PowerShell prevents script execution, run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
  or simply use Command Prompt (`cmd`) or double-click `build-windows.bat`.
- **Packaging takes a minute on first run**: On the very first build, `electron-builder` downloads the official Electron binaries for Windows. Subsequent builds will take just a few seconds.
