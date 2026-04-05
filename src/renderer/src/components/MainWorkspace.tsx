import type { CharactersDocument } from '@shared/characters-types'
import type { FragmentsDocument } from '@shared/fragments-types'
import type {
  CharacterRepresentationChoice,
  RenderingTypeChoice,
  StyleSetupKey
} from '../sample-story'
import { workspaceLabel, type WorkspaceViewId } from '../workspace-views'
import { StoryView } from './StoryView'
import { CharactersView } from './CharactersView'
import { ScriptBreakdownView } from './ScriptBreakdownView'

export type { WorkspaceViewId } from '../workspace-views'

type Props = {
  active: WorkspaceViewId
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
  storyGenerateDisabled: boolean
  gentlePulseGenerateCharacters: boolean
  sessionId: string
  charactersDocument: CharactersDocument | null
  charactersGenerating: boolean
  charactersGenerateError: string | null
  onCharactersDocumentChange: (doc: CharactersDocument) => void
  onRetryCharactersGenerate: () => void
  onCharactersApproved: (doc: CharactersDocument) => void
  onCharactersUnlock: () => void
  charactersSheetLocked: boolean
  onPersistedFragmentsChange: (doc: FragmentsDocument | null) => void
  onAppendAgentLine: (kind: 'user' | 'model' | 'error', text: string) => void
}

export function MainWorkspace({
  active,
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
  storyGenerateDisabled,
  gentlePulseGenerateCharacters,
  sessionId,
  charactersDocument,
  charactersGenerating,
  charactersGenerateError,
  onCharactersDocumentChange,
  onRetryCharactersGenerate,
  onCharactersApproved,
  onCharactersUnlock,
  charactersSheetLocked,
  onPersistedFragmentsChange,
  onAppendAgentLine
}: Props) {
  const pageTitle = workspaceLabel(active)

  return (
    <section className="main-workspace" aria-label="Editor">
      <div className="editor-breadcrumb">
        <span className="editor-breadcrumb__muted">Vid-Agent</span>
        <span className="editor-breadcrumb__sep" aria-hidden>
          ›
        </span>
        <span className="editor-breadcrumb__current">{pageTitle}</span>
      </div>
      <div className="editor-content">
        {active === 'story' && (
          <StoryView
            story={story}
            onStoryChange={onStoryChange}
            styleSetupFields={styleSetupFields}
            onStyleSetupFieldChange={onStyleSetupFieldChange}
            onStyleSetupFieldsSample={onStyleSetupFieldsSample}
            renderingType={renderingType}
            onRenderingTypeChange={onRenderingTypeChange}
            characterRepresentation={characterRepresentation}
            onCharacterRepresentationChange={onCharacterRepresentationChange}
            onSampleStoryInserted={onSampleStoryInserted}
            onGenerateCharacters={onGenerateCharacters}
            generateDisabled={storyGenerateDisabled}
            gentlePulseGenerate={gentlePulseGenerateCharacters}
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
            onAppendAgentLine={onAppendAgentLine}
          />
        )}
        {active === 'fragmentedScript' && (
          <ScriptBreakdownView
            sessionId={sessionId}
            charactersSheetLocked={charactersSheetLocked}
            story={story}
            styleSetupFields={styleSetupFields}
            renderingType={renderingType}
            characterRepresentation={characterRepresentation}
            charactersDocument={charactersDocument}
            onPersistedFragmentsChange={onPersistedFragmentsChange}
            onAppendAgentLine={onAppendAgentLine}
          />
        )}
        {active === 'clips' && (
          <div className="workspace-placeholder">
            <p className="editor-section-label">Clips</p>
            <p>Clips — coming next.</p>
          </div>
        )}
        {active === 'video' && (
          <div className="workspace-placeholder">
            <p className="editor-section-label">Video</p>
            <p>Video — coming next.</p>
          </div>
        )}
      </div>
    </section>
  )
}
