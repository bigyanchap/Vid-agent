/** System prompt for Gemini — character extraction (exact project spec). */
export const CHARACTERS_GENERATION_PROMPT = `
Generate characters cleverly based on the story using these rules:

READING THE STORY:

- Extract every named character, even if they appear briefly
- If a character is unnamed but visually present (e.g. "a guard", 
  "the old woman"), still create an entry for them with a generated id
- Infer personality and role from how the story describes their actions,
  not just their name
- If the story is from a specific culture (e.g. Hindu culture, Japanese 
  folklore, African fable, cartoon, speaking animals, etc.), use culturally accurate names, 
  clothing, skin tones, and visual references — do not westernize them unnecessarily. 

VISUAL CONSISTENCY RULES:
- Every visual detail must be specific enough that two different artists
  would draw the same thing. Bad example: "wears nice clothes". 
  Good example: "wears a saffron dhoti with gold border, bare chest, peacock 
  feather in hair"
- outfit never changes and must list 2-4 items that will appear in 
  EVERY frame this character appears in, no exceptions
- color_palette hex values must be specific and consistent — 
  these will be injected into every video generation prompt
- distinctive_features must include at least one unique visual marker
  that makes this character instantly recognizable in a crowd

RENDERING STYLE:
- rendering style must match the story style
  (cartoon, realistic, anime, storybook etc.)
- rendering consistency is the single most important sentence —
  write it as a hard instruction. For example, "ALWAYS has blue skin, yellow 
  crown, and peacock feather in every frame without exception"

PROMPT FRAGMENT RULES:
- prompt_fragment is the most critical field — it will be copy-pasted
  into every single video generation prompt for this character
- Write it as a dense, comma-separated visual description
- Start with character name and role
- Include: species/type, key colors, key outfit items, art style
- End with a consistency instruction
- Maximum 3 sentences, no line breaks
- Example format: "[Name]: [species/type], [skin/body description], 
  [key outfit items with colors], [distinctive features], 
  [art style], ALWAYS [consistency anchor]"

OUTPUT RULES:
- Return ONLY the raw JSON object matching the schema exactly
- No markdown, no code fences, no explanation, no preamble
- All empty string fields must be filled — no field left as ""
- never_changes must be an array with 2-4 strings, never empty
- generated_at must be current ISO timestamp
- approved and locked must be false
- story_style and story_language must be inferred from the story

THEN:

Each character should have following JSON structure that defines their character:
{
  "meta": {
    "schema_version": "1.0",
    "generated_at": "",
    "approved": false,
    "locked": false,
    "story_style": "",
    "story_language": ""
  },

  "characters": [
    {
      "id": "",
      "name": "",

      "identity": {
        "role": "",
        "species_or_type": "",
        "gender": "",
        "age_description": "",
        "personality": ""
      },

      "appearance": {
        "body": "",
        "skin_fur_or_texture": "",
        "face": "",
        "hair": "",
        "distinctive_features": ""
      },

      "outfit": {
        "primary": "",
        "bottoms": "",
        "footwear": "",
        "accessories": "",
        "never_changes": []
      },

      "color_palette": {
        "skin_or_base": "",
        "outfit_primary": "",
        "outfit_secondary": "",
        "accent": ""
      },

      "rendering": {
        "style": "",
        "line_weight": "",
        "texture": "",
        "face_expressiveness": "",
        "consistency_anchor": ""
      },

      "voice": {
        "tone": "",
        "accent": "",
        "speech_pattern": ""
      },

      "prompt_fragment": ""
    }
  ]
}
`
