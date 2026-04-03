import { SAMPLE_STORY } from '../sample-story'

type Props = {
  story: string
  onStoryChange: (value: string) => void
}

export function StoryView({ story, onStoryChange }: Props) {
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
      </div>
    </div>
  )
}
