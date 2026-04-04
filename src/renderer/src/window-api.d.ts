export {}

import type { CharactersDocument } from '@shared/characters-types'

type ChatMessage = { role: 'user' | 'model'; text: string }

type CharacterPortraitResult =
  | { ok: true; mimeType: string; dataBase64: string }
  | { ok: false; error: string }

declare global {
  interface Window {
    api: {
      getGeminiApiKey: () => Promise<string>
      setGeminiApiKey: (key: string) => Promise<void>
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
    }
  }
}
