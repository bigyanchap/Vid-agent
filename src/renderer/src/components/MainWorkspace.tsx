import { StoryView } from './StoryView'

export type WorkspaceViewId = 'story' | 'characters' | 'fragmentedScript' | 'clips' | 'video'

const TABS: { id: WorkspaceViewId; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'characters', label: 'Characters' },
  { id: 'fragmentedScript', label: 'Fragmented Script' },
  { id: 'clips', label: 'Clips' },
  { id: 'video', label: 'Video' }
]

type Props = {
  active: WorkspaceViewId
  onActiveChange: (id: WorkspaceViewId) => void
  story: string
  onStoryChange: (value: string) => void
}

export function MainWorkspace({ active, onActiveChange, story, onStoryChange }: Props) {
  return (
    <section className="main-workspace" aria-label="Editor">
      <div className="main-workspace__body">
        {active === 'story' && <StoryView story={story} onStoryChange={onStoryChange} />}
        {active === 'characters' && (
          <div className="workspace-placeholder">
            <p>Characters — coming next.</p>
          </div>
        )}
        {active === 'fragmentedScript' && (
          <div className="workspace-placeholder">
            <p>Fragmented Script — coming next.</p>
          </div>
        )}
        {active === 'clips' && (
          <div className="workspace-placeholder">
            <p>Clips — coming next.</p>
          </div>
        )}
        {active === 'video' && (
          <div className="workspace-placeholder">
            <p>Video — coming next.</p>
          </div>
        )}
      </div>
      <nav className="main-workspace__tabs" aria-label="Primary views">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`workspace-tab${active === id ? ' is-active' : ''}`}
            onClick={() => onActiveChange(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </section>
  )
}
