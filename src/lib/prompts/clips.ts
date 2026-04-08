import type { CharacterEntry } from '../../shared/characters-types'
import type { CharacterMeta } from '../../shared/characters-types'
import type { FragmentFrame, FragmentsMeta } from '../../shared/fragments-types'

function charById(characters: CharacterEntry[], id: string): CharacterEntry | undefined {
  return characters.find((c) => c.id === id)
}

function neverChangesLines(char: CharacterEntry): string {
  const items = Array.isArray(char.outfit?.never_changes) ? char.outfit.never_changes.filter(Boolean) : []
  if (items.length === 0) return ''
  return items.map((s) => `- ${char.name || char.id}: ${s}`).join('\n')
}

/**
 * Single readable prompt for Veo / Imagen from one frame plus character bible data.
 */
export function buildClipPrompt(
  frame: FragmentFrame,
  characters: CharacterEntry[],
  charactersMeta: CharacterMeta,
  fragmentsMeta: FragmentsMeta
): string {
  const visualStyle =
    [fragmentsMeta.story_style, charactersMeta.story_style].find((s) => typeof s === 'string' && s.trim())?.trim() ||
    'As established in the project story style.'

  const dialogueLines: string[] = []
  for (const line of frame.who_says_what || []) {
    const ch = charById(characters, line.character_id)
    const name = ch?.name || line.character_id || 'Character'
    if (line.line?.trim()) {
      dialogueLines.push(`${name} says: ${line.line.trim()}`)
    }
  }
  const dialogueBlock =
    dialogueLines.length > 0
      ? dialogueLines.join('\n')
      : 'No spoken dialogue in this shot; ambient sound only unless the scene clearly implies otherwise.'

  const present = (frame.characters_present || [])
    .map((id) => charById(characters, id))
    .filter((c): c is CharacterEntry => Boolean(c))

  const promptFragments = present
    .map((c) => {
      const frag = (c.prompt_fragment || '').trim()
      if (!frag) return ''
      return `${c.name || c.id}: ${frag}`
    })
    .filter(Boolean)
    .join('\n\n')

  const consistencyBlocks = present
    .map((c) => {
      const nc = neverChangesLines(c)
      if (!nc) return ''
      return `For character "${c.name || c.id}" the following must never change:\n${nc}`
    })
    .filter(Boolean)
    .join('\n\n')

  const colorAnchors = present
    .map((c) => {
      const cp = c.color_palette
      return `${c.name || c.id}: base ${cp.skin_or_base || '(see sheet)'}, outfit primary ${cp.outfit_primary || '(see sheet)'}, secondary ${cp.outfit_secondary || '(see sheet)'}, accent ${cp.accent || '(see sheet)'}`
    })
    .join('\n')

  return [
    'Scene for this clip:',
    '',
    frame.scene_description?.trim() || '(no scene description)',
    '',
    'Story beat (this moment):',
    '',
    frame.story_chunk?.trim() || '(no story chunk)',
    '',
    `Camera: ${frame.camera_hint}. Target clip length: ${frame.duration_seconds} seconds.`,
    '',
    `Visual style / story tone: ${visualStyle}`,
    '',
    'Dialogue and delivery:',
    '',
    dialogueBlock,
    '',
    'Character appearance and behavior anchors (from approved character sheet):',
    '',
    promptFragments || '(no prompt fragments for characters in frame)',
    '',
    'Hard consistency rules:',
    '',
    consistencyBlocks || '(no explicit never_changes list; still match the character sheet exactly.)',
    '',
    'Color consistency reference:',
    '',
    colorAnchors || '(see character sheet)',
    '',
    'Closing instruction: Do not alter any character appearance, outfit, proportions, or color palette from the approved reference. Keep every visible character visually consistent with the descriptions above for the full duration of the clip.'
  ].join('\n')
}
