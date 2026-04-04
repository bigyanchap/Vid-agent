/** Paragraphs use \\n\\n only so lines wrap to the full textarea width (no narrow hard-wrapped column). */
export const SAMPLE_STORY = `Once upon a time, a little rabbit named Hoppy lived in a sunny meadow.  Hoppy loved to explore but was scared of the dark forest.  One day, his friend Squirrel found a shiny red apple.  "Let's share it!" said Squirrel.  They hopped toward the forest edge.  Suddenly, a big wind blew leaves everywhere.  Hoppy hid behind a bush, trembling.  Squirrel laughed, "It's just wind, silly!"  They found more friends: Bird and Turtle.  Together, they entered the forest bravely.  Bird sang a happy song to guide them.  Turtle moved slowly but never gave up.  Deep inside, they discovered a sparkling stream.  Hoppy jumped with joy and splashed water.  They shared the apple under a tall tree.  The sun peeked through, chasing away fears.  Hoppy learned friends make everything fun.  From then on, he visited the forest daily.  All the animals played and laughed together.  And they lived happily ever after.  The friends planned picnics beside the stream.  Fireflies arrived at dusk like tiny lanterns.  Hoppy learned that courage grows a little every day.  Seasons changed, yet the meadow always welcomed them home.  Old maps led to hidden clearings.  They drew pictures in the sand with sticks.  Every journey felt safer with company.  They celebrated small wins and kept exploring together.`


export const STYLE_SETUP_KEYS = ['Theme', 'Style', 'Setup', 'Mood', 'Era', 'World', 'Constraints'] as const
export type StyleSetupKey = (typeof STYLE_SETUP_KEYS)[number]

/** Sent to the model when a Theme / Style / … field is left blank. */
export const STYLE_SETUP_VALUE_WHEN_EMPTY = 'Choose yourself wisely.'

export const SAMPLE_STYLE_SETUP_VALUES: Record<StyleSetupKey, string> = {
  Theme: 'overcoming fear with friendship and bravery',
  Style: 'Anime Cartoon',
  Setup: 'light forest, grass, rivers',
  Mood: 'playful, adventurous, curious',
  Era: 'Medieval',
  World: 'Medieval Forest',
  Constraints: 'no magic, no superpowers'
}

/** Placeholder hints for each value field (same order as {@link STYLE_SETUP_KEYS}). */
export const STYLE_SETUP_PLACEHOLDERS: Record<StyleSetupKey, string> = {
  Theme: 'e.g. overcoming fear with friendship and bravery',
  Style: 'e.g. Anime Cartoon',
  Setup: 'e.g. light forest, grass, rivers',
  Mood: 'e.g. playful, adventurous',
  Era: 'e.g. Medieval',
  World: 'e.g. Medieval Forest',
  Constraints: 'e.g. No talking animals'
}

export function buildStyleSetupBlock(fields: Record<StyleSetupKey, string>): string {
  return STYLE_SETUP_KEYS.map((k) => {
    const v = fields[k].trim()
    return v ? `${k}: ${v}` : ''
  })
    .filter(Boolean)
    .join('\n')
}

/** Every key is included; blanks become {@link STYLE_SETUP_VALUE_WHEN_EMPTY} (for Gemini). */
export function buildStyleSetupBlockForGeneration(fields: Record<StyleSetupKey, string>): string {
  return STYLE_SETUP_KEYS.map((k) => {
    const v = fields[k].trim()
    return `${k}: ${v || STYLE_SETUP_VALUE_WHEN_EMPTY}`
  }).join('\n')
}

export const SAMPLE_THEME_STYLE_SETUP = `${buildStyleSetupBlock(SAMPLE_STYLE_SETUP_VALUES)}\n`
