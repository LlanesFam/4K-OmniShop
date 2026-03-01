import { app, shell, BrowserWindow, ipcMain, dialog, session, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    fullscreen: true,
    // resizable is managed dynamically via IPC — windowed mode sets false, fullscreen/borderless unsets it
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Allow Google login popup
    if (
      details.url.includes('accounts.google.com') ||
      details.url.includes('firebaseapp.com') ||
      details.url.includes('api.sanity.io')
    ) {
      return { action: 'allow' }
    }
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // ── Content-Security-Policy ──────────────────────────────────────────────
  // In dev, Vite's dev server is on localhost and already trusted.
  // Injecting extra CSP headers in dev can cause Electron's webRequest
  // interceptor to interfere with Vite's JS module responses and break HMR.
  // We only inject CSP headers in production (file:// protocol).
  if (!is.dev) {
    const CSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.google.com https://*.firebaseapp.com https://api.cloudinary.com https://res.cloudinary.com",
      "frame-src 'self' https://accounts.google.com https://*.google.com https://*.firebaseapp.com",
      "worker-src 'self' blob:"
    ].join('; ')

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const contentType = (
        details.responseHeaders?.['content-type'] ??
        details.responseHeaders?.['Content-Type'] ??
        []
      ).join('')
      if (contentType.includes('text/html')) {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [CSP]
          }
        })
      } else {
        callback({ responseHeaders: details.responseHeaders })
      }
    })
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('update-display', (_, config: { mode: string; width?: number; height?: number }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return

    if (config.mode === 'fullscreen') {
      win.setFullScreen(true)
      win.setResizable(false)
    } else if (config.mode === 'borderless') {
      win.setFullScreen(false)
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.workAreaSize
      win.setBounds({ x: 0, y: 0, width, height })
      win.setResizable(false)
    } else if (config.mode === 'windowed') {
      win.setFullScreen(false)
      if (win.isMaximized()) win.unmaximize()
      if (config.width && config.height) {
        win.setBounds({ width: config.width, height: config.height })
        win.center()
      }
      setTimeout(() => {
        // A little delay on resizing ensures bounds are respected after full screen exit
        win.setResizable(false)
      }, 100)
    }
  })

  createWindow()

  // Auto Updater
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('error', (message) => {
    console.error('There was a problem updating the application')
    console.error(message)
  })

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of OmniShop is available. Downloading now...'
    })
  })

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. Install and restart now?',
        buttons: ['Yes', 'Later']
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
