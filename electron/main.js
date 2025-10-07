const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const { networkInterfaces } = require('os')

let mainWindow
let tray
let serverProcess

function getLocalIP() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'MyTech Quizer',
    backgroundColor: '#667eea'
  })

  // Load the local server
  mainWindow.loadURL('http://localhost:3000')

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  // Create icon for tray
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const localIP = getLocalIP()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'MyTech Quizer',
      enabled: false
    },
    { type: 'separator' },
    {
      label: `Server läuft auf:`,
      enabled: false
    },
    {
      label: `→ http://localhost:3000`,
      click: () => {
        mainWindow?.loadURL('http://localhost:3000')
        mainWindow?.show()
      }
    },
    {
      label: `→ http://mtquiz.local:3000`,
      enabled: false
    },
    {
      label: `→ http://${localIP}:3000`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Fenster anzeigen',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        } else {
          createWindow()
        }
      }
    },
    {
      label: 'Beenden',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('MyTech Quizer Server')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
    } else {
      createWindow()
    }
  })
}

function startServer() {
  const serverPath = path.join(__dirname, '../server/local-server.js')

  console.log('Starting server:', serverPath)

  serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  })

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err)
  })

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`)
  })
}

app.whenReady().then(() => {
  // Start backend server
  startServer()

  // Wait for server to start
  setTimeout(() => {
    createWindow()
    createTray()
  }, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Keep app running even when window is closed (server stays active)
  // Only quit on macOS when user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Kill server process
  if (serverProcess) {
    serverProcess.kill()
  }
})

app.on('quit', () => {
  // Ensure server is killed
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
  }
})
