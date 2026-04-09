import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type ChatMessage = { role: 'user' | 'model'; text: string }

export type AppSettingsPayload = Record<string, unknown>

export type GeminiChatResult = { text?: string; error?: string }

export type CharacterPortraitResult =
  | { ok: true; mimeType: string; dataBase64: string }
  | { ok: false; error: string }

/** Minimal shape for preload typing; full type lives in @shared for renderer */
export type CharactersDocumentPayload = Record<string, unknown>
export type FragmentsDocumentPayload = Record<string, unknown>
export type FragmentsGeneratePayload = Record<string, unknown>

export type ClipsDocUpdatePayload = {
  sessionId: string
  document: FragmentsDocumentPayload
  frameIndex: number
}

export type ClipsLogPayload = {
  sessionId: string
  kind: 'user' | 'model' | 'error'
  text: string
  clipAction?: 'proceed-clips' | 'proceed-video'
}

export type ClipsPipelineStatePayload = {
  sessionId: string
  running: boolean
  paused: boolean
}

const api = {
  getGeminiApiKey: (): Promise<string> => ipcRenderer.invoke('config:getGeminiApiKey'),
  setGeminiApiKey: (key: string): Promise<void> =>
    ipcRenderer.invoke('config:setGeminiApiKey', key),

  settingsLoad: (): Promise<AppSettingsPayload> => ipcRenderer.invoke('settings:load'),

  settingsSave: (payload: AppSettingsPayload): Promise<{ ok: true }> =>
    ipcRenderer.invoke('settings:save', payload),

  settingsUiSummary: (): Promise<{
    textProviderLabel: string
    videoProviderLabel: string
    settingsGearBadge: boolean
  }> => ipcRenderer.invoke('settings:uiSummary'),

  settingsValidateGeneration: (
    op: 'characters' | 'fragments' | 'clips'
  ): Promise<{ ok: true } | { ok: false; message: string }> =>
    ipcRenderer.invoke('settings:validateGeneration', op),

  onSettingsUpdated: (cb: () => void): (() => void) => {
    const fn = (): void => cb()
    ipcRenderer.on('settings:updated', fn)
    return () => {
      ipcRenderer.removeListener('settings:updated', fn)
    }
  },
  geminiChat: (messages: ChatMessage[]): Promise<GeminiChatResult> =>
    ipcRenderer.invoke('gemini:chat', { messages }),

  geminiCharacterPortrait: (payload: { prompt: string }): Promise<CharacterPortraitResult> =>
    ipcRenderer.invoke('gemini:characterPortrait', payload),

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
  > => ipcRenderer.invoke('characters:unlock', sessionId),

  fragmentsLoad: (sessionId: string): Promise<FragmentsDocumentPayload | null> =>
    ipcRenderer.invoke('fragments:load', sessionId),

  fragmentsSave: (
    sessionId: string,
    document: FragmentsDocumentPayload
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('fragments:save', { sessionId, document }),

  fragmentsGenerate: (
    payload: FragmentsGeneratePayload
  ): Promise<
    | { ok: true; data: FragmentsDocumentPayload; savedPath: string }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('fragments:generate', payload),

  fragmentsApprove: (
    sessionId: string
  ): Promise<
    | { ok: true; data: FragmentsDocumentPayload }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('fragments:approve', sessionId),

  projectStatus: (sessionId: string): Promise<string | undefined> =>
    ipcRenderer.invoke('project:status', sessionId),

  clipsStart: (sessionId: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('clips:start', sessionId),

  clipsPause: (): Promise<{ ok: true }> => ipcRenderer.invoke('clips:pause'),

  clipsResume: (
    sessionId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('clips:resume', sessionId),

  clipsRegenerate: (
    sessionId: string,
    frameId: number
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('clips:regenerate', { sessionId, frameId }),

  clipsBusy: (): Promise<boolean> => ipcRenderer.invoke('clips:busy'),

  clipsMediaUrl: (sessionId: string, relativePath: string): Promise<string> =>
    ipcRenderer.invoke('clips:mediaUrl', { sessionId, relativePath }),

  seedImageUpload: (
    sessionId: string,
    frameId: number,
    dataBase64: string
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('seedImage:upload', { sessionId, frameId, dataBase64 }),

  seedImageGenerate: (
    sessionId: string,
    frameId: number
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('seedImage:generate', { sessionId, frameId }),

  seedImageClear: (
    sessionId: string,
    frameId: number
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('seedImage:clear', { sessionId, frameId }),

  onClipsDocUpdate: (cb: (p: ClipsDocUpdatePayload) => void): (() => void) => {
    const fn = (_e: unknown, p: ClipsDocUpdatePayload): void => cb(p)
    ipcRenderer.on('clips:docUpdate', fn)
    return () => {
      ipcRenderer.removeListener('clips:docUpdate', fn)
    }
  },

  onClipsLog: (cb: (p: ClipsLogPayload) => void): (() => void) => {
    const fn = (_e: unknown, p: ClipsLogPayload): void => cb(p)
    ipcRenderer.on('clips:log', fn)
    return () => {
      ipcRenderer.removeListener('clips:log', fn)
    }
  },

  onClipsPipelineState: (cb: (p: ClipsPipelineStatePayload) => void): (() => void) => {
    const fn = (_e: unknown, p: ClipsPipelineStatePayload): void => cb(p)
    ipcRenderer.on('clips:pipelineState', fn)
    return () => {
      ipcRenderer.removeListener('clips:pipelineState', fn)
    }
  }
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
