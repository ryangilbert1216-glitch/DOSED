const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('peptideDesktop', {
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body }),
})
