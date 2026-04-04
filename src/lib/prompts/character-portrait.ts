import type { CharacterEntry } from '@shared/characters-types'

/** User message for Gemini image models — portrait from structured character sheet. */
export function buildCharacterPortraitPrompt(
  char: CharacterEntry,
  storyStyle: string,
  storyLanguage: string
): string {
  const metaParts: string[] = []
  if (storyStyle.trim()) metaParts.push(`Story visual style: ${storyStyle.trim()}.`)
  if (storyLanguage.trim()) metaParts.push(`Story language context: ${storyLanguage.trim()}.`)
  const meta = metaParts.join(' ')

  const lines: string[] = [
    'Generate one clear character illustration (portrait or upper body) for a story production bible.',
    'Match the described appearance, outfit, palette, and rendering style as closely as possible.',
    'Use a simple or neutral background. Do not add captions, labels, or watermark text in the image.',
    ...(meta ? [`Context: ${meta}`, ''] : ['']),
    `Name: ${char.name || '(unnamed)'}`,
    `Role: ${char.identity.role}`,
    `Species / type: ${char.identity.species_or_type}`,
    `Gender: ${char.identity.gender}`,
    `Age: ${char.identity.age_description}`,
    `Personality (expression): ${char.identity.personality}`,
    '',
    `Body: ${char.appearance.body}`,
    `Skin / fur / texture: ${char.appearance.skin_fur_or_texture}`,
    `Face: ${char.appearance.face}`,
    `Hair: ${char.appearance.hair}`,
    `Distinctive features: ${char.appearance.distinctive_features}`,
    '',
    `Outfit — primary: ${char.outfit.primary}; bottoms: ${char.outfit.bottoms}; footwear: ${char.outfit.footwear}; accessories: ${char.outfit.accessories}.`,
    `Never-change details: ${char.outfit.never_changes.join('; ')}`,
    '',
    `Colors — base: ${char.color_palette.skin_or_base}; outfit primary: ${char.color_palette.outfit_primary}; secondary: ${char.color_palette.outfit_secondary}; accent: ${char.color_palette.accent}.`,
    '',
    `Rendering style: ${char.rendering.style}; line weight: ${char.rendering.line_weight}; texture: ${char.rendering.texture}; expressiveness: ${char.rendering.face_expressiveness}.`,
    `Consistency anchor: ${char.rendering.consistency_anchor}`,
    '',
    `Prompt fragment (follow closely): ${char.prompt_fragment}`
  ]

  return lines.filter((s) => s !== '').join('\n')
}
