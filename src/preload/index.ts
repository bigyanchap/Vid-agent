import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type ChatMessage = { role: 'user' | 'model'; text: string }

export type GeminiChatResult = { text?: string; error?: string }

/** Minimal shape for preload typing; full type lives in @shared for renderer */
export type CharactersDocumentPayload = Record<string, unknown>

const api = {
  getGeminiApiKey: (): Promise<string> => ipcRenderer.invoke('config:getGeminiApiKey'),
  setGeminiApiKey: (key: string): Promise<void> =>
    ipcRenderer.invoke('config:setGeminiApiKey', key),
  geminiChat: (messages: ChatMessage[]): Promise<GeminiChatResult> =>
    ipcRenderer.invoke('gemini:chat', { messages }),

  charactersLoad: (sessionId: string): Promise<CharactersDocumentPayload | null> =>
    ipcRenderer.invoke('characters:load', sessionId),

  charactersSave: (
    sessionId: string,
    document: CharactersDocumentPayload
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('characters:save', { sessionId, document }),

  charactersGenerate: (
    sessionId: string,
    story: string
  ): Promise<
    | { ok: true; data: CharactersDocumentPayload; savedPath: string }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('characters:generate', { sessionId, story }),

  charactersRegenerate: (
    sessionId: string,
    story: string
  ): Promise<
    | { ok: true; data: CharactersDocumentPayload; savedPath: string }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('characters:regenerate', { sessionId, story }),

  charactersApprove: (
    sessionId: string,
    document: CharactersDocumentPayload
  ): Promise<
    | { ok: true; data: CharactersDocumentPayload }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('characters:approve', { sessionId, document }),

  charactersUnlock: (
    sessionId: string
  ): Promise<
    | { ok: true; data: CharactersDocumentPayload }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('characters:unlock', sessionId)
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
