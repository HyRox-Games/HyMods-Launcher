const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let serverInstance;

function createWindow() {
    const iconPath = path.join(__dirname, 'assets/icons/icon.png');
    const fs = require('fs');

    const windowOptions = {
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#0a0e27',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        frame: true,
        autoHideMenuBar: true,
        show: false
    };

    // Add icon only if file exists
    if (fs.existsSync(iconPath)) {
        windowOptions.icon = iconPath;
    }

    mainWindow = new BrowserWindow(windowOptions);

    mainWindow.loadFile('src/index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const { autoUpdater } = require('electron-updater');

// Configure autoUpdater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false; // Let user decide or auto-download


// Auto-updater events
autoUpdater.on('update-available', () => {
    if (mainWindow) {
        mainWindow.webContents.send('update start');
        // Auto download or ask user
        autoUpdater.downloadUpdate();
    }
});

autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
        mainWindow.webContents.send('update ready');
        // Install immediately or wait
        // autoUpdater.quitAndInstall(); 
    }
});

app.whenReady().then(async () => {
    // Server and Tracker logic removed - App now connects to cloud server

    createWindow();

    // Check for updates
    if (app.isPackaged) {
        autoUpdater.checkForUpdates();
    }

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

app.on('quit', () => {
});
