import { Fragment } from 'react'
import {
  SAMPLE_STORY,
  STYLE_SETUP_KEYS,
  STYLE_SETUP_PLACEHOLDERS,
  VISUAL_STYLE_CHARACTER_PILLS,
  VISUAL_STYLE_RENDERING_PILLS,
  type CharacterRepresentationChoice,
  type RenderingTypeChoice,
  type StyleSetupKey
} from '../sample-story'
import { btnNextHint, btnNextHintWrapClassNames } from '../styles/buttonNextHint'

const STORY_PLACEHOLDER =
  'Write your story here. The longer and more detailed, the better your characters and scenes will be.'

type Props = {
  story: string
  onStoryChange: (value: string) => void
  styleSetupFields: Record<StyleSetupKey, string>
  onStyleSetupFieldChange: (key: StyleSetupKey, value: string) => void
  onStyleSetupFieldsSample: () => void
  renderingType: RenderingTypeChoice
  onRenderingTypeChange: (value: RenderingTypeChoice) => void
  characterRepresentation: CharacterRepresentationChoice
  onCharacterRepresentationChange: (value: CharacterRepresentationChoice) => void
  onSampleStoryInserted?: (insertedStoryText: string) => void
  onGenerateCharacters: () => void
  generateDisabled: boolean
  gentlePulseGenerate: boolean
}

export function StoryView({
  story,
  onStoryChange,
  styleSetupFields,
  onStyleSetupFieldChange,
  onStyleSetupFieldsSample,
  renderingType,
  onRenderingTypeChange,
  characterRepresentation,
  onCharacterRepresentationChange,
  onSampleStoryInserted,
  onGenerateCharacters,
  generateDisabled,
  gentlePulseGenerate
}: Props) {
  const pulseOn = gentlePulseGenerate && !generateDisabled

  return (
    <div className="story-view">
      <div className="story-editor__toolbar">
        <span className="story-editor__toolbar-hint">Write your story below or</span>
        <button
          type="button"
          className="story-editor__link-btn"
          onClick={() => {
            onStoryChange(SAMPLE_STORY)
            onStyleSetupFieldsSample()
            onSampleStoryInserted?.(SAMPLE_STORY)
          }}
        >
          insert a sample story⬇
        </button>
      </div>

      <textarea
        className="story-editor__textarea"
        placeholder={STORY_PLACEHOLDER}
        value={story}
        onChange={(e) => onStoryChange(e.target.value)}
        spellCheck={true}
      />
      <div className="story-editor__char-count" aria-live="polite">
        {story.length} characters
      </div>

      <h2 className="story-editor__section-label--visual">Visual Style</h2>
      <div
        className="visual-style-pills"
        role="group"
        aria-label="Visual style — pick one rendering and one character type, or leave unset"
      >
        {VISUAL_STYLE_RENDERING_PILLS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            className={`visual-style-pill${renderingType === value ? ' visual-style-pill--selected' : ''}`}
            aria-pressed={renderingType === value}
            onClick={() => onRenderingTypeChange(renderingType === value ? '' : value)}
          >
            {label}
          </button>
        ))}
        {VISUAL_STYLE_CHARACTER_PILLS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            className={`visual-style-pill${characterRepresentation === value ? ' visual-style-pill--selected' : ''}`}
            aria-pressed={characterRepresentation === value}
            onClick={() =>
              onCharacterRepresentationChange(characterRepresentation === value ? '' : value)
            }
          >
            {label}
          </button>
        ))}
      </div>
      <p className="story-editor__helper--visual">Pick one from each group or leave to model</p>

      <h2 className="editor-section-label">World settings</h2>
      <div className="world-settings-grid" role="group" aria-label="World settings">
        {STYLE_SETUP_KEYS.map((key) => (
          <Fragment key={key}>
            <label className="world-settings-grid__label" htmlFor={`story-kv-${key}`}>
              {key}
            </label>
            <input
              id={`story-kv-${key}`}
              className="world-settings-grid__input"
              type="text"
              value={styleSetupFields[key]}
              onChange={(e) => onStyleSetupFieldChange(key, e.target.value)}
              placeholder={STYLE_SETUP_PLACEHOLDERS[key]}
              spellCheck={true}
              autoComplete="off"
            />
          </Fragment>
        ))}
      </div>

      <div className="story-editor__generate-wrap">
        {pulseOn ? (
          <span className={btnNextHintWrapClassNames({ glow: true })}>
            <button
              type="button"
              className={`btn-generate btn-generate--story ${btnNextHint.target}`}
              disabled={generateDisabled}
              onClick={onGenerateCharacters}
            >
              Generate Characters
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn-generate btn-generate--story"
            disabled={generateDisabled}
            onClick={onGenerateCharacters}
          >
            Generate Characters
          </button>
        )}
      </div>
    </div>
  )
}
