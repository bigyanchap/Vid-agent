import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { coerceAppSettings } from '../shared/app-settings'
import { getGeminiApiKey, setGeminiApiKey } from './config-store'
import type { GeminiTurn } from './gemini'
import { generateCharacterPortraitRouted } from './provider-image'
import { callTextModelConversation } from './provider-text'
import {
  approveCharacters,
  generateAndSaveCharacters,
  regenerateCharactersFromStory,
  unlockCharactersForEdit
} from './characters-generate'
import { clipMediaUrlFromPath } from './clip-protocol'
import {
  readCharactersFile,
  readFragmentsFile,
  readProjectStatus,
  sessionDir,
  writeCharactersFile,
  writeFragmentsFile
} from './characters-files'
import {
  clipsPause,
  clipsPipelineIsBusy,
  clipsResume,
  regenerateClipFrame,
  runClipPipeline
} from './clips-pipeline'
import { seedImageClear, seedImageGenerate, seedImageUpload } from './seed-images'
import { approveFragments, generateAndSaveFragments } from './fragments-generate'
import type { CharactersDocument } from '../shared/characters-types'
import type { FragmentsDocument } from '../shared/fragments-types'
import {
  getSettingsUiSummary,
  loadAppSettings,
  saveAppSettings,
  validateGenerationGate,
  validateVideoProvider
} from './settings-store'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

export function registerIpc(): void {
  ipcMain.handle('config:getGeminiApiKey', () => getGeminiApiKey())

  ipcMain.handle('config:setGeminiApiKey', (_evt, key: string) => {
    setGeminiApiKey(typeof key === 'string' ? key : '')
  })

  ipcMain.handle('settings:load', () => loadAppSettings())

  ipcMain.handle('settings:save', (_evt, payload: unknown) => {
    const incoming = coerceAppSettings(payload)
    const prev = loadAppSettings()
    saveAppSettings(incoming, prev)
    broadcast('settings:updated', {})
    return { ok: true as const }
  })

  ipcMain.handle('settings:uiSummary', () => getSettingsUiSummary())

  ipcMain.handle(
    'settings:validateGeneration',
    (_evt, op: 'characters' | 'fragments' | 'clips') => {
      if (op === 'clips') {
        const v = validateVideoProvider()
        if (!v.ok) return { ok: false as const, message: v.message }
        return validateGenerationGate('clips')
      }
      return validateGenerationGate(op)
    }
  )

  ipcMain.handle('gemini:chat', (_evt, payload: { messages: GeminiTurn[] }) => {
    const messages = Array.isArray(payload?.messages) ? payload.messages : []
    return callTextModelConversation(messages)
  })

  ipcMain.handle('gemini:characterPortrait', (_evt, payload: { prompt?: string }) => {
    const prompt = typeof payload?.prompt === 'string' ? payload.prompt : ''
    return generateCharacterPortraitRouted(prompt)
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

  ipcMain.handle('characters:generate', async (_evt, payload: { sessionId: string; story: string }) => {
    if (!payload?.sessionId) {
      return { ok: false as const, error: 'Missing sessionId' }
    }
    try {
      return await generateAndSaveCharacters(payload.sessionId, payload.story ?? '')
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e)
      }
    }
  })

  ipcMain.handle('characters:regenerate', async (_evt, payload: { sessionId: string; story: string }) => {
    if (!payload?.sessionId) {
      return { ok: false as const, error: 'Missing sessionId' }
    }
    try {
      return await regenerateCharactersFromStory(payload.sessionId, payload.story ?? '')
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e)
      }
    }
  })

  ipcMain.handle(
    'characters:approve',
    async (_evt, payload: { sessionId: string; document: CharactersDocument }) => {
      if (!payload?.sessionId || !payload.document) {
        return { ok: false as const, error: 'Missing sessionId or document' }
      }
      try {
        return await approveCharacters(payload.sessionId, payload.document)
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : String(e)
        }
      }
    }
  )

  ipcMain.handle('characters:unlock', (_evt, sessionId: string) => {
    if (typeof sessionId !== 'string' || !sessionId) {
      return Promise.resolve({ ok: false as const, error: 'Missing sessionId' })
    }
    return unlockCharactersForEdit(sessionId)
  })

  ipcMain.handle('fragments:load', (_evt, sessionId: string) => {
    if (typeof sessionId !== 'string' || !sessionId) return null
    return readFragmentsFile(sessionId)
  })

  ipcMain.handle(
    'fragments:save',
    async (_evt, payload: { sessionId: string; document: FragmentsDocument }) => {
      if (!payload?.sessionId || !payload.document) {
        return { ok: false as const, error: 'Invalid payload' }
      }
      try {
        await writeFragmentsFile(payload.sessionId, payload.document)
        return { ok: true as const }
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : String(e)
        }
      }
    }
  )

  ipcMain.handle('fragments:generate', (_evt, payload: unknown) => {
    return generateAndSaveFragments(payload as Parameters<typeof generateAndSaveFragments>[0])
  })

  ipcMain.handle('fragments:approve', (_evt, sessionId: string) => {
    if (typeof sessionId !== 'string' || !sessionId) {
      return Promise.resolve({ ok: false as const, error: 'Missing sessionId' })
    }
    return approveFragments(sessionId)
  })

  ipcMain.handle('project:status', (_evt, sessionId: string) => {
    if (typeof sessionId !== 'string' || !sessionId) return undefined
    return readProjectStatus(sessionId)
  })

  ipcMain.handle('clips:start', (_evt, sessionId: string) => {
    if (typeof sessionId !== 'string' || !sessionId) {
      return Promise.resolve({ ok: false as const, error: 'Missing sessionId' })
    }
    const v = validateVideoProvider()
    if (!v.ok) {
      broadcast('clips:log', { sessionId, kind: 'error', text: v.message })
      return Promise.resolve({ ok: false as const, error: v.message })
    }
    const g = validateGenerationGate('clips')
    if (!g.ok) {
      broadcast('clips:log', { sessionId, kind: 'error', text: g.message })
      return Promise.resolve({ ok: false as const, error: g.message })
    }
    void runClipPipeline({ sessionId })
    return Promise.resolve({ ok: true as const })
  })

  ipcMain.handle('clips:pause', () => {
    clipsPause()
    return Promise.resolve({ ok: true as const })
  })

  ipcMain.handle('clips:resume', (_evt, sessionId: string) => {
    if (typeof sessionId !== 'string' || !sessionId) {
      return Promise.resolve({ ok: false as const, error: 'Missing sessionId' })
    }
    return clipsResume(sessionId)
  })

  ipcMain.handle('clips:regenerate', (_evt, payload: { sessionId: string; frameId: number }) => {
    if (!payload?.sessionId || typeof payload.frameId !== 'number') {
      return Promise.resolve({ ok: false as const, error: 'Invalid payload' })
    }
    return regenerateClipFrame(payload.sessionId, payload.frameId)
  })

  ipcMain.handle('clips:busy', () => clipsPipelineIsBusy())

  ipcMain.handle(
    'clips:mediaUrl',
    (_evt, payload: { sessionId: string; relativePath: string }) => {
      if (!payload?.sessionId || !payload.relativePath) return ''
      const rel = payload.relativePath.replace(/^[/\\]+/, '')
      const abs = join(sessionDir(payload.sessionId), ...rel.split('/'))
      return clipMediaUrlFromPath(abs)
    }
  )

  ipcMain.handle(
    'seedImage:upload',
    async (_evt, payload: { sessionId: string; frameId: number; dataBase64: string }) => {
      if (!payload?.sessionId || typeof payload.frameId !== 'number' || typeof payload.dataBase64 !== 'string') {
        return { ok: false as const, error: 'Invalid payload' }
      }
      return seedImageUpload(payload.sessionId, payload.frameId, payload.dataBase64)
    }
  )

  ipcMain.handle('seedImage:generate', (_evt, payload: { sessionId: string; frameId: number }) => {
    if (!payload?.sessionId || typeof payload.frameId !== 'number') {
      return Promise.resolve({ ok: false as const, error: 'Invalid payload' })
    }
    return seedImageGenerate(payload.sessionId, payload.frameId)
  })

  ipcMain.handle('seedImage:clear', (_evt, payload: { sessionId: string; frameId: number }) => {
    if (!payload?.sessionId || typeof payload.frameId !== 'number') {
      return Promise.resolve({ ok: false as const, error: 'Invalid payload' })
    }
    return seedImageClear(payload.sessionId, payload.frameId)
  })
}
