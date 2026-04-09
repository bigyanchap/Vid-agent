import type { CharactersDocument } from '@shared/characters-types'
import type { FragmentsDocument } from '@shared/fragments-types'
import type {
  CharacterRepresentationChoice,
  RenderingTypeChoice,
  StyleSetupKey
} from '../sample-story'
import { workspaceLabel, type EditorViewId, type WorkspaceViewId } from '../workspace-views'
import { StoryView } from './StoryView'
import { CharactersView } from './CharactersView'
import { ClipsView } from './ClipsView'
import { SeedImagesView } from './SeedImagesView'
import { ScriptBreakdownView } from './ScriptBreakdownView'
import { SettingsView } from './SettingsView'

export type { WorkspaceViewId, EditorViewId } from '../workspace-views'

type Props = {
  active: EditorViewId
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
  onScriptBreakdownApproved?: () => void
  onProceedToClipGeneration?: () => void
  onProceedToClipsFromSeeds?: () => void
  fragmentsDocument: FragmentsDocument | null
  projectStatus: string | undefined
  clipPipeline: { running: boolean; paused: boolean }
  onRefreshProjectStatus: () => void
  onProceedToFinalVideo: () => void
  onSettingsSaved?: () => void
  beforeGenerateFragments?: () => Promise<boolean>
  beforeGenerateClips?: () => Promise<boolean>
  clipGeneratingLabel?: string
  onCloseSettings?: () => void
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
  onAppendAgentLine,
  onScriptBreakdownApproved,
  onProceedToClipGeneration,
  onProceedToClipsFromSeeds,
  fragmentsDocument,
  projectStatus,
  clipPipeline,
  onRefreshProjectStatus,
  onProceedToFinalVideo,
  onSettingsSaved,
  beforeGenerateFragments,
  beforeGenerateClips,
  clipGeneratingLabel,
  onCloseSettings
}: Props) {
  const pageTitle = active === 'settings' ? 'Settings' : workspaceLabel(active)

  return (
    <section className="main-workspace" aria-label="Editor">
      <div className="editor-breadcrumb">
        <span className="editor-breadcrumb__muted">StoryFlow</span>
        <span className="editor-breadcrumb__sep" aria-hidden>
          ›
        </span>
        <span className="editor-breadcrumb__current">{pageTitle}</span>
      </div>
      <div className="editor-content">
        {active === 'settings' && (
          <SettingsView onSaved={onSettingsSaved} onClose={() => onCloseSettings?.()} />
        )}
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
            onScriptBreakdownApproved={onScriptBreakdownApproved}
            onProceedToClipGeneration={onProceedToClipGeneration}
            beforeGenerateFragments={beforeGenerateFragments}
          />
        )}
        {active === 'seedImages' && (
          <SeedImagesView
            sessionId={sessionId}
            fragmentsDocument={fragmentsDocument}
            onProceedToClips={() => onProceedToClipsFromSeeds?.()}
            onAppendAgentLine={onAppendAgentLine}
          />
        )}
        {active === 'clips' && (
          <ClipsView
            sessionId={sessionId}
            fragmentsDocument={fragmentsDocument}
            charactersDocument={charactersDocument}
            projectStatus={projectStatus}
            clipPipeline={clipPipeline}
            onRefreshProjectStatus={onRefreshProjectStatus}
            onProceedToFinalVideo={onProceedToFinalVideo}
            beforeGenerateClips={beforeGenerateClips}
            clipGeneratingLabel={clipGeneratingLabel}
          />
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
