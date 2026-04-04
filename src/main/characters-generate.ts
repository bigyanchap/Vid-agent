import { CHARACTERS_GENERATION_PROMPT } from '../lib/prompts/characters'
import {
  parseCharactersJson,
  type CharacterEntry,
  type CharactersDocument
} from '../shared/characters-types'
import { getGeminiApiKey } from './config-store'
import { callGeminiSystemUser } from './gemini'
import { charactersPath, writeCharactersFile } from './characters-files'

function padNeverChanges(arr: string[] | undefined): string[] {
  const a = Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : []
  while (a.length < 2) {
    a.push('(define in UI)')
  }
  return a.slice(0, 4)
}

function ensureCharacter(raw: Partial<CharacterEntry>): CharacterEntry {
  const id =
    typeof raw.id === 'string' && raw.id
      ? raw.id
      : `char_${Math.random().toString(36).slice(2, 10)}`
  const idn = raw.identity as CharacterEntry['identity'] | undefined
  const ap = raw.appearance as CharacterEntry['appearance'] | undefined
  const ou = raw.outfit as CharacterEntry['outfit'] | undefined
  const cp = raw.color_palette as CharacterEntry['color_palette'] | undefined
  const re = raw.rendering as CharacterEntry['rendering'] | undefined
  const vo = raw.voice as CharacterEntry['voice'] | undefined

  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : '',
    identity: {
      role: idn?.role ?? '',
      species_or_type: idn?.species_or_type ?? '',
      gender: idn?.gender ?? '',
      age_description: idn?.age_description ?? '',
      personality: idn?.personality ?? ''
    },
    appearance: {
      body: ap?.body ?? '',
      skin_fur_or_texture: ap?.skin_fur_or_texture ?? '',
      face: ap?.face ?? '',
      hair: ap?.hair ?? '',
      distinctive_features: ap?.distinctive_features ?? ''
    },
    outfit: {
      primary: ou?.primary ?? '',
      bottoms: ou?.bottoms ?? '',
      footwear: ou?.footwear ?? '',
      accessories: ou?.accessories ?? '',
      never_changes: padNeverChanges(ou?.never_changes)
    },
    color_palette: {
      skin_or_base: cp?.skin_or_base ?? '',
      outfit_primary: cp?.outfit_primary ?? '',
      outfit_secondary: cp?.outfit_secondary ?? '',
      accent: cp?.accent ?? ''
    },
    rendering: {
      style: re?.style ?? '',
      line_weight: re?.line_weight ?? '',
      texture: re?.texture ?? '',
      face_expressiveness: re?.face_expressiveness ?? '',
      consistency_anchor: re?.consistency_anchor ?? ''
    },
    voice: {
      tone: vo?.tone ?? '',
      accent: vo?.accent ?? '',
      speech_pattern: vo?.speech_pattern ?? ''
    },
    prompt_fragment: typeof raw.prompt_fragment === 'string' ? raw.prompt_fragment : ''
  }
}

function normalizeDocument(doc: CharactersDocument): CharactersDocument {
  const now = new Date().toISOString()
  const meta = {
    schema_version: doc.meta?.schema_version || '1.0',
    generated_at: doc.meta?.generated_at || now,
    approved: false,
    locked: false,
    story_style: doc.meta?.story_style ?? '',
    story_language: doc.meta?.story_language ?? ''
  }

  const list = Array.isArray(doc.characters) ? doc.characters : []
  const characters = list.map((c) => ensureCharacter(c as Partial<CharacterEntry>))

  return { meta, characters }
}

export async function generateAndSaveCharacters(
  sessionId: string,
  story: string
): Promise<
  { ok: true; data: CharactersDocument; savedPath: string } | { ok: false; error: string }
> {
  const trimmed = story.trim()
  if (!trimmed) {
    return { ok: false, error: 'Story is empty. Write a story first.' }
  }

  const apiKey = getGeminiApiKey()
  try {
    const res = await callGeminiSystemUser(apiKey, CHARACTERS_GENERATION_PROMPT, trimmed)
    if (res.error) {
      return { ok: false, error: res.error }
    }
    const text = res.text ?? ''
    const parsed = parseCharactersJson(text)
    if (!parsed.ok) {
      return { ok: false, error: parsed.error }
    }

    const normalized = normalizeDocument(parsed.data)
    normalized.meta.generated_at = new Date().toISOString()
    normalized.meta.approved = false
    normalized.meta.locked = false

    await writeCharactersFile(sessionId, normalized)
    return { ok: true, data: normalized, savedPath: charactersPath(sessionId) }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

export async function approveCharacters(
  sessionId: string,
  document: CharactersDocument
): Promise<{ ok: true; data: CharactersDocument } | { ok: false; error: string }> {
  if (!document?.characters?.length) {
    return { ok: false, error: 'No characters to approve.' }
  }
  const next: CharactersDocument = {
    ...document,
    meta: {
      ...document.meta,
      approved: true,
      locked: true
    }
  }
  await writeCharactersFile(sessionId, next)
  return { ok: true, data: next }
}
