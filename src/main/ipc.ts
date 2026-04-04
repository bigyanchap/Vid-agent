import { ipcMain } from 'electron'
import { getGeminiApiKey, setGeminiApiKey } from './config-store'
import { callGemini, type GeminiTurn } from './gemini'
import { approveCharacters, generateAndSaveCharacters } from './characters-generate'
import { readCharactersFile, writeCharactersFile } from './characters-files'
import type { CharactersDocument } from '../shared/characters-types'

export function registerIpc(): void {
  ipcMain.handle('config:getGeminiApiKey', () => getGeminiApiKey())

  ipcMain.handle('config:setGeminiApiKey', (_evt, key: string) => {
    setGeminiApiKey(typeof key === 'string' ? key : '')
  })

  ipcMain.handle('gemini:chat', (_evt, payload: { messages: GeminiTurn[] }) => {
    const messages = Array.isArray(payload?.messages) ? payload.messages : []
    return callGemini(getGeminiApiKey(), messages)
  })

  ipcMain.handle('characters:load', (_evt, sessionId: string) => {
    if (typeof sessionId !== 'string' || !sessionId) return null
    return readCharactersFile(sessionId)
  })

  ipcMain.handle(
    'characters:save',
    async (_evt, payload: { sessionId: string; document: CharactersDocument }) => {
      if (!payload?.sessionId || !payload.document) {
        return { ok: false as const, error: 'Invalid payload' }
      }
      try {
        await writeCharactersFile(payload.sessionId, payload.document)
        return { ok: true as const }
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : String(e)
        }
      }
    }
  )

  ipcMain.handle('characters:generate', (_evt, payload: { sessionId: string; story: string }) => {
    if (!payload?.sessionId) {
      return Promise.resolve({ ok: false as const, error: 'Missing sessionId' })
    }
    return generateAndSaveCharacters(payload.sessionId, payload.story ?? '')
  })

  ipcMain.handle(
    'characters:approve',
    (_evt, payload: { sessionId: string; document: CharactersDocument }) => {
      if (!payload?.sessionId || !payload.document) {
        return Promise.resolve({ ok: false as const, error: 'Missing sessionId or document' })
      }
      return approveCharacters(payload.sessionId, payload.document)
    }
  )
}
