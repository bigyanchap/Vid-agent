import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type ChatMessage = { role: 'user' | 'model'; text: string }

export type GeminiChatResult = { text?: string; error?: string }

const api = {
  getGeminiApiKey: (): Promise<string> => ipcRenderer.invoke('config:getGeminiApiKey'),
  setGeminiApiKey: (key: string): Promise<void> =>
    ipcRenderer.invoke('config:setGeminiApiKey', key),
  geminiChat: (messages: ChatMessage[]): Promise<GeminiChatResult> =>
    ipcRenderer.invoke('gemini:chat', { messages })
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  Object.assign(window, { electron: electronAPI, api })
}
