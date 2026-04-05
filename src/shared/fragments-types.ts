import { stripCodeFences } from './characters-types'

export type FragmentsWorldSettings = {
  visual_style: string
  theme: string
  setup: string
  mood: string
  era: string
  world: string
  constraints: string
}

export type FragmentsGeneratePayload = {
  sessionId: string
  story: string
  visual_style: string
  character_representation: string
  world_settings: FragmentsWorldSettings
}

export type FragmentDialogueLine = { character_id: string; line: string }

export type FragmentFrame = {
  frame_id: number
  story_chunk: string
  scene_description: string
  characters_present: string[]
  camera_hint: string
  duration_seconds: 4 | 6 | 8
  transition: string
  who_says_what: FragmentDialogueLine[]
  status: string
  video_path: string | null
}

export type FragmentsMeta = {
  schema_version: string
  generated_at: string
  total_frames: number
  estimated_duration_seconds: number
  story_style: string
  approved: boolean
  locked: boolean
}

export type FragmentsDocument = {
  meta: FragmentsMeta
  frames: FragmentFrame[]
}

export function stripJsonFences(raw: string): string {
  return raw.replace(/```json|```/gi, '').trim()
}

export function parseFragmentsJson(text: string): { ok: true; data: FragmentsDocument } | { ok: false; error: string } {
  try {
    const stripped = stripJsonFences(stripCodeFences(text))
    const data = JSON.parse(stripped) as unknown
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Response was not a JSON object.' }
    }
    const doc = data as FragmentsDocument
    if (!doc.meta || !Array.isArray(doc.frames)) {
      return { ok: false, error: 'JSON missing meta or frames array.' }
    }
    return { ok: true, data: doc }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON from model.'
    }
  }
}

function clampDuration(n: unknown): 4 | 6 | 8 {
  const v = Number(n)
  if (v === 4 || v === 6 || v === 8) return v
  return 6
}

function normalizeFrame(raw: unknown, index: number): FragmentFrame {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const who = Array.isArray(o.who_says_what)
    ? o.who_says_what
        .map((w) => {
          const x = w && typeof w === 'object' ? (w as Record<string, unknown>) : {}
          return {
            character_id: typeof x.character_id === 'string' ? x.character_id : '',
            line: typeof x.line === 'string' ? x.line : ''
          }
        })
        .filter((d) => d.character_id || d.line)
    : []
  const chars = Array.isArray(o.characters_present)
    ? o.characters_present.filter((id): id is string => typeof id === 'string')
    : []
  const status = typeof o.status === 'string' && o.status ? o.status : 'pending'
  return {
    frame_id: index + 1,
    story_chunk: typeof o.story_chunk === 'string' ? o.story_chunk : '',
    scene_description: typeof o.scene_description === 'string' ? o.scene_description : '',
    characters_present: chars,
    camera_hint: typeof o.camera_hint === 'string' ? o.camera_hint : 'wide shot',
    duration_seconds: clampDuration(o.duration_seconds),
    transition: typeof o.transition === 'string' ? o.transition : 'cut',
    who_says_what: who,
    status,
    video_path: o.video_path === null || typeof o.video_path === 'string' ? (o.video_path as string | null) : null
  }
}

export function normalizeFragmentsDocument(
  doc: FragmentsDocument,
  opts?: { story_style?: string }
): FragmentsDocument {
  const frames = doc.frames.map((f, i) => normalizeFrame(f, i))
  const estimated = frames.reduce((s, f) => s + f.duration_seconds, 0)
  const story_style =
    typeof opts?.story_style === 'string' && opts.story_style
      ? opts.story_style
      : typeof doc.meta?.story_style === 'string'
        ? doc.meta.story_style
        : ''
  return {
    meta: {
      schema_version: typeof doc.meta?.schema_version === 'string' ? doc.meta.schema_version : '1.0',
      generated_at: new Date().toISOString(),
      total_frames: frames.length,
      estimated_duration_seconds: estimated,
      story_style,
      approved: false,
      locked: false
    },
    frames
  }
}

export function renumberFragmentFrames(frames: FragmentFrame[]): FragmentFrame[] {
  return frames.map((f, i) => ({ ...f, frame_id: i + 1 }))
}
