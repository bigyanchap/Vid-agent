import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  coerceAppSettings,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  normalizeImageProvider,
  normalizeTextProvider,
  normalizeVideoProvider,
  TEXT_PROVIDER_LABEL,
  VIDEO_PROVIDER_LABEL
} from '../shared/app-settings'
import { getGeminiApiKey } from './config-store'

const SETTINGS_FILENAME = 'settings.json'
const ENC_PREFIX = 'enc:v1:'

function settingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILENAME)
}

function encryptField(plain: string): string {
  const t = plain.trim()
  if (!t) return ''
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'OS secure storage is unavailable; API keys cannot be encrypted. (Try signing in to your OS account or use a supported platform.)'
    )
  }
  const buf = safeStorage.encryptString(t)
  return ENC_PREFIX + buf.toString('base64')
}

function decryptField(stored: string): string {
  if (!stored) return ''
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return ''
  }
  try {
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64')
    return safeStorage.decryptString(raw)
  } catch {
    return ''
  }
}

function packForDisk(s: AppSettings): AppSettings {
  return {
    text_model: {
      ...s.text_model,
      api_key: encryptField(s.text_model.api_key)
    },
    image_model: {
      ...s.image_model,
      api_key: encryptField(s.image_model.api_key)
    },
    video_model: {
      ...s.video_model,
      api_key: encryptField(s.video_model.api_key)
    }
  }
}

function unpackFromDisk(s: AppSettings): AppSettings {
  return {
    text_model: {
      ...s.text_model,
      api_key: decryptField(s.text_model.api_key)
    },
    image_model: {
      ...s.image_model,
      api_key: decryptField(s.image_model.api_key)
    },
    video_model: {
      ...s.video_model,
      api_key: decryptField(s.video_model.api_key)
    }
  }
}

function migrateLegacyGeminiIfNeeded(): void {
  const p = settingsPath()
  if (existsSync(p)) return
  const key = getGeminiApiKey().trim()
  if (!key) return
  const next: AppSettings = {
    ...structuredClone(DEFAULT_APP_SETTINGS),
    text_model: {
      provider: 'gemini',
      model: DEFAULT_APP_SETTINGS.text_model.model,
      api_key: key
    }
  }
  try {
    const packed = packForDisk(next)
    writeFileSync(p, JSON.stringify(packed, null, 2), 'utf-8')
  } catch {
    /* if encryption fails, skip migration */
  }
}

export function loadAppSettings(): AppSettings {
  migrateLegacyGeminiIfNeeded()
  const p = settingsPath()
  if (!existsSync(p)) {
    return structuredClone(DEFAULT_APP_SETTINGS)
  }
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as unknown
    const coerced = coerceAppSettings(raw)
    return unpackFromDisk(coerced)
  } catch {
    return structuredClone(DEFAULT_APP_SETTINGS)
  }
}

/** Merge: empty incoming api_key keeps previous decrypted key. */
export function saveAppSettings(incoming: AppSettings, previous: AppSettings): void {
  const merged: AppSettings = {
    text_model: {
      ...incoming.text_model,
      api_key: incoming.text_model.api_key.trim() || previous.text_model.api_key
    },
    image_model: {
      ...incoming.image_model,
      api_key: incoming.image_model.api_key.trim() || previous.image_model.api_key
    },
    video_model: {
      ...incoming.video_model,
      api_key: incoming.video_model.api_key.trim() || previous.video_model.api_key
    }
  }
  const packed = packForDisk(merged)
  writeFileSync(settingsPath(), JSON.stringify(packed, null, 2), 'utf-8')
}

export type ResolvedKeys = {
  text: string
  image: string
  video: string
}

export function resolveApiKeys(s: AppSettings): ResolvedKeys {
  const text = s.text_model.api_key.trim()
  const image = s.image_model.api_key.trim()
  const video = s.video_model.api_key.trim()
  return { text, image, video }
}

export type SettingsUiSummary = {
  textProviderLabel: string
  videoProviderLabel: string
  settingsGearBadge: boolean
}

export function getSettingsUiSummary(): SettingsUiSummary {
  const s = loadAppSettings()
  const { text, image, video } = resolveApiKeys(s)
  const tp = normalizeTextProvider(s.text_model.provider)
  const vp = normalizeVideoProvider(s.video_model.provider)
  const textLabel = tp ? TEXT_PROVIDER_LABEL[tp] : s.text_model.provider
  const videoLabel = vp ? VIDEO_PROVIDER_LABEL[vp] : s.video_model.provider
  const textOk = Boolean(text)
  const imageOk = Boolean(image)
  const videoOk = Boolean(video)
  return {
    textProviderLabel: textLabel,
    videoProviderLabel: videoLabel,
    settingsGearBadge: !textOk || !imageOk || !videoOk
  }
}

export type GenerationGate = 'characters' | 'fragments' | 'clips'

export function validateGenerationGate(op: GenerationGate): { ok: true } | { ok: false; message: string } {
  const s = loadAppSettings()
  const keys = resolveApiKeys(s)
  if (!keys.text.trim()) {
    return {
      ok: false,
      message:
        'Text model API key is missing. Go to Settings → Text Model to add it.'
    }
  }
  if (op === 'clips') {
    if (!keys.video.trim()) {
      return {
        ok: false,
        message:
          'Video model API key is missing. Go to Settings → Video Model to add it.'
      }
    }
    return { ok: true }
  }
  if (!normalizeTextProvider(s.text_model.provider)) {
    return {
      ok: false,
      message: `Unknown provider: ${s.text_model.provider}. Please check your Settings.`
    }
  }
  return { ok: true }
}

export function validateImageGate(): { ok: true } | { ok: false; message: string } {
  const s = loadAppSettings()
  const keys = resolveApiKeys(s)
  if (!keys.image.trim()) {
    return {
      ok: false,
      message:
        'Image model API key is missing. Go to Settings → Image Model to add it.'
    }
  }
  if (!normalizeImageProvider(s.image_model.provider)) {
    return {
      ok: false,
      message: `Unknown provider: ${s.image_model.provider}. Please check your Settings.`
    }
  }
  return { ok: true }
}

export function validateVideoProvider(): { ok: true } | { ok: false; message: string } {
  const s = loadAppSettings()
  if (!normalizeVideoProvider(s.video_model.provider)) {
    return {
      ok: false,
      message: `Unknown provider: ${s.video_model.provider}. Please check your Settings.`
    }
  }
  return { ok: true }
}
