const { app, BrowserWindow, Notification, ipcMain } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'DOSED',
    backgroundColor: '#0e0e0e',
    icon: path.join(__dirname, '../build/icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

ipcMain.handle('notify', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
    return true
  }
  return false
})

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.dosed.app')
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
