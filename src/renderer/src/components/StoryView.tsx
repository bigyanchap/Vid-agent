import { SAMPLE_STORY } from '../sample-story'

type Props = {
  story: string
  onStoryChange: (value: string) => void
  themeStyleSetup: string
  onThemeStyleSetupChange: (value: string) => void
}

export function StoryView({
  story,
  onStoryChange,
  themeStyleSetup,
  onThemeStyleSetupChange
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
              onClick={() => onStoryChange(SAMPLE_STORY)}
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
        <div className="story-card__context">
          <label className="story-card__context-label" htmlFor="story-theme-style-setup">
            Theme, style, and setup
          </label>
          <textarea
            id="story-theme-style-setup"
            className="story-card__context-textarea"
            placeholder="Optional: theme, visual style, and setup (mood, era, world, constraints)…"
            value={themeStyleSetup}
            onChange={(e) => onThemeStyleSetupChange(e.target.value)}
            spellCheck={true}
          />
        </div>
      </div>
    </div>
  )
}
