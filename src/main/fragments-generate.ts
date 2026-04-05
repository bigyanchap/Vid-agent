import { FRAGMENTS_GENERATION_PROMPT } from '../lib/prompts/fragments'
import {
  normalizeFragmentsDocument,
  parseFragmentsJson,
  type FragmentsDocument,
  type FragmentsGeneratePayload
} from '../shared/fragments-types'
import { getGeminiApiKey } from './config-store'
import { callGeminiSystemUser } from './gemini'
import {
  fragmentsPath,
  mergeProjectJson,
  readCharactersFile,
  readFragmentsFile,
  writeFragmentsFile
} from './characters-files'

export async function generateAndSaveFragments(
  payload: FragmentsGeneratePayload
): Promise<
  { ok: true; data: FragmentsDocument; savedPath: string } | { ok: false; error: string }
> {
  const { sessionId, story, visual_style, character_representation, world_settings } = payload
  if (!sessionId) {
    return { ok: false, error: 'Missing sessionId.' }
  }
  const chars = await readCharactersFile(sessionId)
  if (!chars) {
    return { ok: false, error: 'No characters.json found. Approve characters first.' }
  }

  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    return { ok: false, error: 'Add a Gemini API key in Settings (gear icon).' }
  }

  const userMessage = JSON.stringify({
    story: story.trim(),
    visual_style: visual_style ?? '',
    character_representation: character_representation ?? '',
    world_settings,
    characters: chars
  })

  console.log('[Vid-Agent] Generate Script Breakdown → Gemini request')
  console.log('--- systemInstruction (fragments generation) ---\n' + FRAGMENTS_GENERATION_PROMPT)
  console.log('--- user message (fragments JSON payload) ---\n' + userMessage)

  const res = await callGeminiSystemUser(apiKey, FRAGMENTS_GENERATION_PROMPT, userMessage)
  if (res.error) {
    return { ok: false, error: res.error }
  }

  const parsed = parseFragmentsJson(res.text ?? '')
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  const story_style = typeof chars.meta?.story_style === 'string' ? chars.meta.story_style : ''
  const normalized = normalizeFragmentsDocument(parsed.data, { story_style })
  normalized.meta.generated_at = new Date().toISOString()
  normalized.meta.total_frames = normalized.frames.length
  normalized.meta.estimated_duration_seconds = normalized.frames.reduce(
    (s, f) => s + f.duration_seconds,
    0
  )
  normalized.meta.approved = false
  normalized.meta.locked = false

  await writeFragmentsFile(sessionId, normalized)
  return { ok: true, data: normalized, savedPath: fragmentsPath(sessionId) }
}

export async function approveFragments(
  sessionId: string
): Promise<{ ok: true; data: FragmentsDocument } | { ok: false; error: string }> {
  const doc = await readFragmentsFile(sessionId)
  if (!doc?.frames?.length) {
    return { ok: false, error: 'No script breakdown to approve.' }
  }
  const next: FragmentsDocument = {
    ...doc,
    meta: {
      ...doc.meta,
      approved: true,
      locked: true,
      total_frames: doc.frames.length,
      estimated_duration_seconds: doc.frames.reduce((s, f) => s + f.duration_seconds, 0)
    }
  }
  await writeFragmentsFile(sessionId, next)
  await mergeProjectJson(sessionId, { status: 'fragments_approved' })
  return { ok: true, data: next }
}
