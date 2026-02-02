const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

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
            contextIsolation: false
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

    // DevTools disabled
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const { autoUpdater } = require('electron-updater');

// Configure autoUpdater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;

// Auto-updater events
autoUpdater.on('update-available', () => {
    if (mainWindow) {
        mainWindow.webContents.send('update start');
        autoUpdater.downloadUpdate();
    }
});

autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
        mainWindow.webContents.send('update ready');
    }
});

app.whenReady().then(() => {
    createWindow();

    // Check for updates (only in packaged app)
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
