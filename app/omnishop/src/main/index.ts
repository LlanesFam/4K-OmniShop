import { app, shell, BrowserWindow, ipcMain, dialog, session, screen } from 'electron'
import { join, extname, resolve as resolvePath, normalize, sep } from 'path'
import http from 'http'
import fs from 'fs'
import type { AddressInfo } from 'net'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'

// ─── Localhost Static Server (Firebase Auth Fix) ──────────────────────────────
// In production, Electron loads files via file:// whose origin is "null".
// Firebase Auth rejects "null" as an unauthorized domain during signInWithPopup.
// Serving the renderer from http://localhost:<port> fixes this because
// Firebase always includes "localhost" in its authorized domains by default.

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json'
}

let localServer: http.Server | null = null

function startStaticServer(dir: string): Promise<number> {
  return new Promise((resolve) => {
    localServer = http.createServer((req, res) => {
      let urlPath = (req.url ?? '/').split('?')[0]
      if (urlPath === '/') urlPath = '/index.html'

      // Guard against malformed percent-encoding — decodeURIComponent throws on
      // invalid sequences (e.g. /%E0%A4%A). Fall back to index.html on error.
      let decodedPath: string
      try {
        decodedPath = decodeURIComponent(urlPath)
      } catch {
        const fallback = join(dir, 'index.html')
        const fallbackContentType = MIME_TYPES['.html']
        fs.readFile(fallback, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('Not found')
            return
          }
          res.writeHead(200, { 'Content-Type': fallbackContentType })
          res.end(data)
        })
        return
      }

      // Guard against path traversal attacks (e.g. /../sensitive-file).
      // Resolve to an absolute path and confirm it stays within the renderer dir.
      const abs = resolvePath(join(dir, normalize(decodedPath)))
      const isSafe = abs === dir || abs.startsWith(dir + sep)

      // SPA fallback — unknown or unsafe paths serve index.html for client-side routing
      const target =
        isSafe && fs.existsSync(abs) && !fs.statSync(abs).isDirectory()
          ? abs
          : join(dir, 'index.html')

      const contentType = MIME_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream'
      fs.readFile(target, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(data)
      })
    })
    localServer.listen(0, '127.0.0.1', () => {
      resolve((localServer!.address() as AddressInfo).port)
    })
  })
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    fullscreen: true,
    // resizable is forced to false across all display modes (fixed resolution); managed via IPC
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // ── Google OAuth popup support ───────────────────────────────────────────
  // Firebase signInWithPopup opens a new window. We must:
  //   1. Let setWindowOpenHandler return 'allow' for Google/Firebase URLs
  //   2. Listen for did-create-window and configure the popup's CSP so that
  //      accounts.google.com can run its own scripts safely.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (
      details.url.includes('accounts.google.com') ||
      details.url.includes('firebaseapp.com') ||
      details.url.includes('google.com/o/oauth') ||
      details.url.includes('omnishop.quadkore.app') ||
      details.url.includes('api.sanity.io')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          width: 500,
          height: 700,
          webPreferences: {
            sandbox: true,
            // Use a dedicated in-memory partition so CSP overrides on this popup's
            // session don't affect the main window's default session handlers.
            partition: 'partition:oauth'
          }
        }
      }
    }
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Allow the popup window to finish the OAuth flow without CSP blocking.
  // The CSP handler is registered per-popup and removed when the popup closes,
  // so it doesn't accumulate across multiple sign-in attempts.
  mainWindow.webContents.on('did-create-window', (popup) => {
    // Capture the session reference NOW, while webContents is still alive.
    // The 'closed' event fires after the BrowserWindow (and its webContents)
    // are destroyed, so accessing popup.webContents inside that handler throws
    // "TypeError: Object has been destroyed". The session object itself outlives
    // the window, so it is safe to call methods on it after close.
    const popupSession = popup.webContents.session

    const cspHandler: Parameters<typeof popupSession.webRequest.onHeadersReceived>[0] = (
      details,
      callback
    ) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:"
          ]
        }
      })
    }
    popupSession.webRequest.onHeadersReceived(cspHandler)
    popup.on('closed', () => {
      // Remove the CSP override via the saved session ref — do NOT use
      // popup.webContents here; it is already destroyed at this point.
      popupSession.webRequest.onHeadersReceived(null)
    })
  })

  // Load the dev-server URL in development, or start a local static server in
  // production so the renderer origin is http://localhost (an authorized Firebase
  // Auth domain) rather than the opaque file:// origin.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    startStaticServer(join(__dirname, '../renderer')).then((port) => {
      mainWindow.loadURL(`http://localhost:${port}`)
    })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows (must match appId in electron-builder.yml)
  electronApp.setAppUserModelId('com.4komni.omnishop')

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
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.google.com https://*.firebaseapp.com https://api.cloudinary.com https://res.cloudinary.com https://omnishop.quadkore.app",
      "frame-src 'self' https://accounts.google.com https://*.google.com https://*.firebaseapp.com https://omnishop.quadkore.app",
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

  // Quit the app (called from renderer's quit buttons)
  ipcMain.on('app:quit', () => {
    localServer?.close()
    app.quit()
  })

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

  // Auto Updater: only check for updates in packaged, non-dev builds
  if (!is.dev && app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
  }

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
  localServer?.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
