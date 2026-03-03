import { app, shell, BrowserWindow, ipcMain, session, screen } from 'electron'
import { join, extname, resolve as resolvePath, normalize, sep } from 'path'
import http from 'http'
import fs from 'fs'
import type { AddressInfo } from 'net'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initUpdater } from './updater'

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

// ─── Persistent Port ─────────────────────────────────────────────────────────
// The renderer is served from http://localhost:<port>. Firebase Auth stores
// its session token in localStorage keyed to the page origin
// (scheme + host + port). If the port changes between launches (port 0
// assigns a random OS port), the stored token becomes invisible and the user
// is forced to log in again even while offline.
// Fixing this: persist the port to userData/server-port.json and always try
// the same port first. Fall back to a small range on collision.

const DEFAULT_PORT = 34521

function readPersistedPort(): number {
  try {
    const file = join(app.getPath('userData'), 'server-port.json')
    if (fs.existsSync(file)) {
      const { port } = JSON.parse(fs.readFileSync(file, 'utf-8')) as { port: number }
      if (typeof port === 'number' && port > 1024 && port < 65535) return port
    }
  } catch {
    // ignore — fall through to default
  }
  return DEFAULT_PORT
}

function writePersistedPort(port: number): void {
  try {
    fs.writeFileSync(join(app.getPath('userData'), 'server-port.json'), JSON.stringify({ port }))
  } catch {
    // ignore — non-critical
  }
}

// ─── Persisted Display Settings ──────────────────────────────────────────────
// Saves and restores the user's display mode and window size across launches,
// so the app always starts with the last-chosen resolution/mode.

interface DisplaySettings {
  mode: 'fullscreen' | 'borderless' | 'windowed'
  width: number
  height: number
}

function readDisplaySettings(): DisplaySettings {
  try {
    const file = join(app.getPath('userData'), 'display-settings.json')
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as DisplaySettings
      if (
        ['fullscreen', 'borderless', 'windowed'].includes(data.mode) &&
        typeof data.width === 'number' &&
        typeof data.height === 'number'
      ) {
        return data
      }
    }
  } catch {
    // ignore — fall through to default
  }
  return { mode: 'fullscreen', width: 1280, height: 720 }
}

function writeDisplaySettings(settings: DisplaySettings): void {
  try {
    fs.writeFileSync(
      join(app.getPath('userData'), 'display-settings.json'),
      JSON.stringify(settings)
    )
  } catch {
    // ignore — non-critical
  }
}

function startStaticServer(dir: string): Promise<number> {
  const candidates = [
    readPersistedPort(),
    DEFAULT_PORT,
    DEFAULT_PORT + 1,
    DEFAULT_PORT + 2,
    DEFAULT_PORT + 3
  ]

  // Try each candidate port in order. On EADDRINUSE move to the next one.
  // Deduplicate so the same value isn't tried twice (e.g. readPersistedPort
  // returns DEFAULT_PORT when no file exists).
  const uniqueCandidates = [...new Set(candidates)]

  function tryPort(index: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const port = uniqueCandidates[index]

      // Build the request handler
      const handler = (req: http.IncomingMessage, res: http.ServerResponse): void => {
        let urlPath = (req.url ?? '/').split('?')[0]
        if (urlPath === '/') urlPath = '/index.html'

        let decodedPath: string
        try {
          decodedPath = decodeURIComponent(urlPath)
        } catch {
          const fallback = join(dir, 'index.html')
          fs.readFile(fallback, (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' })
              res.end('Not found')
              return
            }
            res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] })
            res.end(data)
          })
          return
        }

        const abs = resolvePath(join(dir, normalize(decodedPath)))
        const isSafe = abs === dir || abs.startsWith(dir + sep)
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
      }

      const realServer = http.createServer(handler)

      realServer.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && index + 1 < uniqueCandidates.length) {
          tryPort(index + 1)
            .then(resolve)
            .catch(reject)
        } else {
          reject(err)
        }
      })

      realServer.listen(port, '127.0.0.1', () => {
        const boundPort = (realServer.address() as AddressInfo).port
        localServer = realServer
        writePersistedPort(boundPort)
        resolve(boundPort)
      })
    })
  }

  return tryPort(0)
}

function createWindow(): void {
  // Restore the user's last-chosen display mode and window dimensions.
  // Falls back to `{ mode: 'fullscreen', width: 1280, height: 720 }` on first run.
  const savedDisplay = readDisplaySettings()

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: savedDisplay.width,
    height: savedDisplay.height,
    show: false,
    autoHideMenuBar: true,
    fullscreen: savedDisplay.mode === 'fullscreen',
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
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.google.com https://*.firebaseapp.com https://api.cloudinary.com https://res.cloudinary.com https://omnishop.quadkore.app https://www.gstatic.com https://www.gstatic.com/generate_204 https://*.api.sanity.io https://cdn.sanity.io",
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

  // Debug — open native DevTools for the main window
  ipcMain.handle('debug:open-devtools', () => {
    BrowserWindow.getAllWindows()[0]?.webContents.openDevTools()
  })

  ipcMain.on('update-display', (_, config: { mode: string; width?: number; height?: number }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return

    // Persist the user's choice so it survives app restarts.
    writeDisplaySettings({
      mode: config.mode as 'fullscreen' | 'borderless' | 'windowed',
      width: config.width ?? 1280,
      height: config.height ?? 720
    })

    if (config.mode === 'fullscreen') {
      // Bug fix: switching from a windowed resolution (e.g. 720p) back to
      // fullscreen would retain the small window bounds in "fullscreen" mode
      // and not actually fill the display.
      // Fix: explicitly reset the window bounds to the full display area first,
      // then engage fullscreen after a short delay to let the resize settle.
      const primaryDisplay = screen.getPrimaryDisplay()
      const { x, y, width, height } = primaryDisplay.bounds
      win.setResizable(true)
      if (win.isFullScreen()) win.setFullScreen(false)
      if (win.isMaximized()) win.unmaximize()
      win.setBounds({ x, y, width, height })
      setTimeout(() => {
        win.setFullScreen(true)
        win.setResizable(false)
      }, 80)
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

  // In-app updater — IPC-driven, no native dialogs
  initUpdater()

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
