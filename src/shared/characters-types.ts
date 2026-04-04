export type CharacterMeta = {
  schema_version: string
  generated_at: string
  approved: boolean
  locked: boolean
  story_style: string
  story_language: string
}

export type CharacterEntry = {
  id: string
  name: string
  identity: {
    role: string
    species_or_type: string
    gender: string
    age_description: string
    personality: string
  }
  appearance: {
    body: string
    skin_fur_or_texture: string
    face: string
    hair: string
    distinctive_features: string
  }
  outfit: {
    primary: string
    bottoms: string
    footwear: string
    accessories: string
    never_changes: string[]
  }
  color_palette: {
    skin_or_base: string
    outfit_primary: string
    outfit_secondary: string
    accent: string
  }
  rendering: {
    style: string
    line_weight: string
    texture: string
    face_expressiveness: string
    consistency_anchor: string
  }
  voice: {
    tone: string
    accent: string
    speech_pattern: string
  }
  prompt_fragment: string
}

export type CharactersDocument = {
  meta: CharacterMeta
  characters: CharacterEntry[]
}

/** New blank character for manual add (matches pipeline normalization shape). */
export function createEmptyCharacterEntry(): CharacterEntry {
  const id = `char_${Math.random().toString(36).slice(2, 10)}`
  return {
    id,
    name: '',
    identity: {
      role: '',
      species_or_type: '',
      gender: '',
      age_description: '',
      personality: ''
    },
    appearance: {
      body: '',
      skin_fur_or_texture: '',
      face: '',
      hair: '',
      distinctive_features: ''
    },
    outfit: {
      primary: '',
      bottoms: '',
      footwear: '',
      accessories: '',
      never_changes: ['(define in UI)', '(define in UI)']
    },
    color_palette: {
      skin_or_base: '',
      outfit_primary: '',
      outfit_secondary: '',
      accent: ''
    },
    rendering: {
      style: '',
      line_weight: '',
      texture: '',
      face_expressiveness: '',
      consistency_anchor: ''
    },
    voice: {
      tone: '',
      accent: '',
      speech_pattern: ''
    },
    prompt_fragment: ''
  }
}

export function createEmptyCharactersDocument(): CharactersDocument {
  const now = new Date().toISOString()
  return {
    meta: {
      schema_version: '1.0',
      generated_at: now,
      approved: false,
      locked: false,
      story_style: '',
      story_language: ''
    },
    characters: [createEmptyCharacterEntry()]
  }
}

export function stripCodeFences(raw: string): string {
  let t = raw.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '')
    const last = t.lastIndexOf('```')
    if (last >= 0) t = t.slice(0, last)
  }
  return t.trim()
}

export function parseCharactersJson(text: string): { ok: true; data: CharactersDocument } | { ok: false; error: string } {
  try {
    const stripped = stripCodeFences(text)
    const data = JSON.parse(stripped) as unknown
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Response was not a JSON object.' }
    }
    const doc = data as CharactersDocument
    if (!doc.meta || !Array.isArray(doc.characters)) {
      return { ok: false, error: 'JSON missing meta or characters array.' }
    }
    return { ok: true, data: doc }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON from model.'
    }
  }
}
