import type { CharactersDocument } from '@shared/characters-types'
import { StoryView } from './StoryView'
import { CharactersView } from './CharactersView'

export type WorkspaceViewId = 'story' | 'characters' | 'fragmentedScript' | 'clips' | 'video'

const TABS: { id: WorkspaceViewId; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'characters', label: 'Characters' },
  { id: 'fragmentedScript', label: 'Script Breakdown' },
  { id: 'clips', label: 'Clips' },
  { id: 'video', label: 'Video' }
]

type Props = {
  active: WorkspaceViewId
  onActiveChange: (id: WorkspaceViewId) => void
  story: string
  onStoryChange: (value: string) => void
  themeStyleSetup: string
  onThemeStyleSetupChange: (value: string) => void
  sessionId: string
  charactersDocument: CharactersDocument | null
  charactersGenerating: boolean
  charactersGenerateError: string | null
  onCharactersDocumentChange: (doc: CharactersDocument) => void
  onRetryCharactersGenerate: () => void
  onCharactersApproved: (doc: CharactersDocument) => void
  onCharactersUnlock: () => void
  fragmentedScriptUnlocked: boolean
  /** Lock Characters until Generate Characters / whole-video suggestion is used, or a sheet exists */
  onlyStoryUnlocked: boolean
}

export function MainWorkspace({
  active,
  onActiveChange,
  story,
  onStoryChange,
  themeStyleSetup,
  onThemeStyleSetupChange,
  sessionId,
  charactersDocument,
  charactersGenerating,
  charactersGenerateError,
  onCharactersDocumentChange,
  onRetryCharactersGenerate,
  onCharactersApproved,
  onCharactersUnlock,
  fragmentedScriptUnlocked,
  onlyStoryUnlocked
}: Props) {
  return (
    <section className="main-workspace" aria-label="Editor">
      <div
        className={`main-workspace__body${active === 'story' ? ' main-workspace__body--story' : ''}`}
      >
        {active === 'story' && (
          <StoryView
            story={story}
            onStoryChange={onStoryChange}
            themeStyleSetup={themeStyleSetup}
            onThemeStyleSetupChange={onThemeStyleSetupChange}
          />
        )}
        {active === 'characters' && (
          <CharactersView
            sessionId={sessionId}
            document={charactersDocument}
            isGenerating={charactersGenerating}
            generateError={charactersGenerateError}
            onRetryGenerate={onRetryCharactersGenerate}
            onDocumentChange={onCharactersDocumentChange}
            onApproved={onCharactersApproved}
            onUnlock={onCharactersUnlock}
          />
        )}
        {active === 'fragmentedScript' && (
          <div className="workspace-placeholder">
            <p>Script Breakdown — coming next.</p>
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
          const lockedCharacters = id === 'characters' && onlyStoryUnlocked
          const lockedDownstream =
            (id === 'fragmentedScript' || id === 'clips' || id === 'video') &&
            !fragmentedScriptUnlocked
          const locked = lockedCharacters || lockedDownstream
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
