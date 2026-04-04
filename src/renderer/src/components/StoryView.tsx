import {
  SAMPLE_STORY,
  STYLE_SETUP_KEYS,
  STYLE_SETUP_PLACEHOLDERS,
  type StyleSetupKey
} from '../sample-story'

type Props = {
  story: string
  onStoryChange: (value: string) => void
  styleSetupFields: Record<StyleSetupKey, string>
  onStyleSetupFieldChange: (key: StyleSetupKey, value: string) => void
  onStyleSetupFieldsSample: () => void
  onSampleStoryInserted?: (insertedStoryText: string) => void
}

export function StoryView({
  story,
  onStoryChange,
  styleSetupFields,
  onStyleSetupFieldChange,
  onStyleSetupFieldsSample,
  onSampleStoryInserted
}: Props) {
  return (
    <div className="story-view">
      <div className="story-card">
        <div className="story-card__toolbar">
          <div className="story-card__toolbar-inline">
            <span className="story-card__hint">Write your story below... OR</span>
            <button
              type="button"
              className="story-card__sample-btn"
              onClick={() => {
                onStoryChange(SAMPLE_STORY)
                onStyleSetupFieldsSample()
                onSampleStoryInserted?.(SAMPLE_STORY)
              }}
            >
              Insert a Sample Story
            </button>
          </div>
        </div>
        <textarea
          className="story-card__textarea"
          placeholder="Write your story here..."
          value={story}
          onChange={(e) => onStoryChange(e.target.value)}
          spellCheck={true}
        />
        <div className="story-card__kv-block">
          <div className="story-card__kv-toolbar">
            <span className="story-card__kv-heading">Style, setup & world</span>
          </div>
          <p className="story-card__kv-hint" id="story-kv-hint">
            One value per row; keys stay fixed. Example row:{' '}
            <span className="story-card__kv-hint-mono">Style: Anime Cartoon</span>
          </p>
          <div className="story-card__kv-rows" role="group" aria-describedby="story-kv-hint">
            {STYLE_SETUP_KEYS.map((key) => (
              <div key={key} className="story-card__kv-row">
                <label className="story-card__kv-key" htmlFor={`story-kv-${key}`}>
                  {key}:
                </label>
                <input
                  id={`story-kv-${key}`}
                  className="story-card__kv-input"
                  type="text"
                  value={styleSetupFields[key]}
                  onChange={(e) => onStyleSetupFieldChange(key, e.target.value)}
                  placeholder={STYLE_SETUP_PLACEHOLDERS[key]}
                  spellCheck={true}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
