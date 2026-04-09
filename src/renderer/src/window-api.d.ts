export {}

import type { AppSettings } from '@shared/app-settings'
import type { CharactersDocument } from '@shared/characters-types'
import type { FragmentsDocument, FragmentsGeneratePayload } from '@shared/fragments-types'

type ChatMessage = { role: 'user' | 'model'; text: string }

type CharacterPortraitResult =
  | { ok: true; mimeType: string; dataBase64: string }
  | { ok: false; error: string }

declare global {
  interface Window {
    api: {
      getGeminiApiKey: () => Promise<string>
      setGeminiApiKey: (key: string) => Promise<void>
      settingsLoad: () => Promise<AppSettings>
      settingsSave: (payload: AppSettings) => Promise<{ ok: true }>
      settingsUiSummary: () => Promise<{
        textProviderLabel: string
        videoProviderLabel: string
        settingsGearBadge: boolean
      }>
      settingsValidateGeneration: (
        op: 'characters' | 'fragments' | 'clips'
      ) => Promise<{ ok: true } | { ok: false; message: string }>
      onSettingsUpdated: (cb: () => void) => () => void
      geminiChat: (messages: ChatMessage[]) => Promise<{ text?: string; error?: string }>
      geminiCharacterPortrait: (payload: { prompt: string }) => Promise<CharacterPortraitResult>
      charactersLoad: (sessionId: string) => Promise<CharactersDocument | null>
      charactersSave: (
        sessionId: string,
        document: CharactersDocument
      ) => Promise<{ ok: true } | { ok: false; error: string }>
      charactersGenerate: (
        sessionId: string,
        story: string
      ) => Promise<
        | { ok: true; data: CharactersDocument; savedPath: string }
        | { ok: false; error: string }
      >
      charactersRegenerate: (
        sessionId: string,
        story: string
      ) => Promise<
        | { ok: true; data: CharactersDocument; savedPath: string }
        | { ok: false; error: string }
      >
      charactersApprove: (
        sessionId: string,
        document: CharactersDocument
      ) => Promise<{ ok: true; data: CharactersDocument } | { ok: false; error: string }>
      charactersUnlock: (
        sessionId: string
      ) => Promise<{ ok: true; data: CharactersDocument } | { ok: false; error: string }>
      fragmentsLoad: (sessionId: string) => Promise<FragmentsDocument | null>
      fragmentsSave: (
        sessionId: string,
        document: FragmentsDocument
      ) => Promise<{ ok: true } | { ok: false; error: string }>
      fragmentsGenerate: (
        payload: FragmentsGeneratePayload
      ) => Promise<
        | { ok: true; data: FragmentsDocument; savedPath: string }
        | { ok: false; error: string }
      >
      fragmentsApprove: (
        sessionId: string
      ) => Promise<{ ok: true; data: FragmentsDocument } | { ok: false; error: string }>
      projectStatus: (sessionId: string) => Promise<string | undefined>
      clipsStart: (sessionId: string) => Promise<{ ok: true } | { ok: false; error: string }>
      clipsPause: () => Promise<{ ok: true }>
      clipsResume: (sessionId: string) => Promise<{ ok: true } | { ok: false; error: string }>
      clipsRegenerate: (
        sessionId: string,
        frameId: number
      ) => Promise<{ ok: true } | { ok: false; error: string }>
      clipsBusy: () => Promise<boolean>
      clipsMediaUrl: (sessionId: string, relativePath: string) => Promise<string>
      seedImageUpload: (
        sessionId: string,
        frameId: number,
        dataBase64: string
      ) => Promise<{ ok: true } | { ok: false; error: string }>
      seedImageGenerate: (
        sessionId: string,
        frameId: number
      ) => Promise<{ ok: true } | { ok: false; error: string }>
      seedImageClear: (
        sessionId: string,
        frameId: number
      ) => Promise<{ ok: true } | { ok: false; error: string }>
      onClipsDocUpdate: (cb: (p: { sessionId: string; document: FragmentsDocument; frameIndex: number }) => void) => () => void
      onClipsLog: (
        cb: (p: {
          sessionId: string
          kind: 'user' | 'model' | 'error'
          text: string
          clipAction?: 'proceed-clips' | 'proceed-video'
        }) => void
      ) => () => void
      onClipsPipelineState: (
        cb: (p: { sessionId: string; running: boolean; paused: boolean }) => void
      ) => () => void
    }
  }
}
