import type { CharactersDocument } from '@shared/characters-types'
import { StoryView } from './StoryView'
import { CharactersView } from './CharactersView'

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
  sessionId: string
  charactersDocument: CharactersDocument | null
  charactersGenerating: boolean
  charactersGenerateError: string | null
  onCharactersDocumentChange: (doc: CharactersDocument) => void
  onRetryCharactersGenerate: () => void
  onCharactersApproved: (doc: CharactersDocument) => void
  fragmentedScriptUnlocked: boolean
}

export function MainWorkspace({
  active,
  onActiveChange,
  story,
  onStoryChange,
  sessionId,
  charactersDocument,
  charactersGenerating,
  charactersGenerateError,
  onCharactersDocumentChange,
  onRetryCharactersGenerate,
  onCharactersApproved,
  fragmentedScriptUnlocked
}: Props) {
  return (
    <section className="main-workspace" aria-label="Editor">
      <div className="main-workspace__body">
        {active === 'story' && <StoryView story={story} onStoryChange={onStoryChange} />}
        {active === 'characters' && (
          <CharactersView
            sessionId={sessionId}
            document={charactersDocument}
            isGenerating={charactersGenerating}
            generateError={charactersGenerateError}
            onRetryGenerate={onRetryCharactersGenerate}
            onDocumentChange={onCharactersDocumentChange}
            onApproved={onCharactersApproved}
          />
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
        {TABS.map(({ id, label }) => {
          const locked = id === 'fragmentedScript' && !fragmentedScriptUnlocked
          return (
            <button
              key={id}
              type="button"
              className={`workspace-tab${active === id ? ' is-active' : ''}${locked ? ' workspace-tab--locked' : ''}`}
              disabled={locked}
              onClick={() => onActiveChange(id)}
            >
              {label}
            </button>
          )
        })}
      </nav>
    </section>
  )
}
