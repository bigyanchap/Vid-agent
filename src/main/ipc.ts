import { ipcMain } from 'electron'
import { getGeminiApiKey, setGeminiApiKey } from './config-store'
import { callGemini, type GeminiTurn } from './gemini'

export function registerIpc(): void {
  ipcMain.handle('config:getGeminiApiKey', () => getGeminiApiKey())

  ipcMain.handle('config:setGeminiApiKey', (_evt, key: string) => {
    setGeminiApiKey(typeof key === 'string' ? key : '')
  })

  ipcMain.handle('gemini:chat', (_evt, payload: { messages: GeminiTurn[] }) => {
    const messages = Array.isArray(payload?.messages) ? payload.messages : []
    return callGemini(getGeminiApiKey(), messages)
  })
}
