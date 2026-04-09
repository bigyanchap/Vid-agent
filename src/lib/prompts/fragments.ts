export const FRAGMENTS_GENERATION_PROMPT = `
Parse the story into cinematic frames using these rules:

FRAME RULES:
- Each frame represents one continuous unbroken scene
- Estimate total video length from story then divide by 6
  for base frame count: 1 min story = ~10 frames
- Never fewer than 5 frames
- Do not skip any story beat

PER FRAME FIELDS:
- story_chunk: the narrative moment, 2-3 sentences, present tense
- scene_description: detailed visual description of what camera
  sees — location, time of day, mood, background. Specific enough
  for a video director.
- characters_present: array of character ids — use ONLY ids that
  exist in the provided characters JSON. No new ids.
- camera_hint: exactly one of:
  "wide shot" | "medium shot" | "close-up" |
  "overhead" | "low angle" | "tracking shot"
- duration_seconds: one of 4 | 6 | 8 (integer, not string)
  Use 4 for fast action or quick transition scenes
  Use 6 for standard narrative scenes
  Use 8 for slow emotional or dialogue-heavy scenes
- transition: exactly one of: "cut" | "fade" | "dissolve"
  "fade" only for very first and very last frame
  "dissolve" for time passing or location change
  "cut" for everything else
- who_says_what: array of dialogue objects for this frame
  Each item: { "character_id": "", "line": "" }
  character_id must exactly match an id from characters JSON
  line is one sentence of spoken dialogue maximum
  If no dialogue in this frame, return empty array []
- status: always "pending"
- video_path: always null
- seed_image_path: always null (user adds seed images in the app later)

CONSISTENCY RULES:
- Use world_settings to inform every scene_description
- Use visual_style and character_representation in all
  rendering and scene choices
- Do not repeat same camera_hint more than 3 times in a row
- characters_present must only contain ids from characters JSON
- who_says_what character_id must only contain ids from
  characters JSON

OUTPUT RULES:
- Return ONLY raw JSON matching schema below
- No markdown, no code fences, no explanation, no preamble
- Every string field must be filled — nothing left empty
- frame_id starts at 1, increments by 1, no gaps
- meta.total_frames = actual number of frames generated
- meta.estimated_duration_seconds = sum of all individual
  frame duration_seconds values (not total_frames × 6)
- No trailing commas anywhere in the JSON

OUTPUT SCHEMA:
{
  "meta": {
    "schema_version": "1.0",
    "generated_at": "",
    "total_frames": 0,
    "estimated_duration_seconds": 0,
    "story_style": "",
    "approved": false,
    "locked": false
  },
  "frames": [
    {
      "frame_id": 1,
      "story_chunk": "",
      "scene_description": "",
      "characters_present": [],
      "camera_hint": "",
      "duration_seconds": 6,
      "transition": "",
      "who_says_what": [],
      "status": "pending",
      "video_path": null,
      "seed_image_path": null
    }
  ]
}
`
