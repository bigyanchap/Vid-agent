import { useCallback, useEffect, useRef, useState } from 'react'
import type { CharactersDocument } from '@shared/characters-types'
import type { FragmentsDocument } from '@shared/fragments-types'
import {
  buildFullStorySetupBlockForGeneration,
  SAMPLE_CHARACTER_REPRESENTATION,
  SAMPLE_RENDERING_TYPE,
  SAMPLE_STYLE_SETUP_VALUES,
  type CharacterRepresentationChoice,
  type RenderingTypeChoice,
  type StyleSetupKey,
  STYLE_SETUP_KEYS
} from './sample-story'
import { ActivityBar } from './components/ActivityBar'
import { AgentChat, type AgentChatHandle } from './components/AgentChat'
import { MainWorkspace } from './components/MainWorkspace'
import { workspaceStatusTag, type EditorViewId, type WorkspaceViewId } from './workspace-views'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function emptyStyleSetupFields(): Record<StyleSetupKey, string> {
  return Object.fromEntries(STYLE_SETUP_KEYS.map((k) => [k, ''])) as Record<StyleSetupKey, string>
}

const LONG_STORY_WORD_THRESHOLD = 200

function countWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

/** Prepends Theme / Setup / … plus rendering & character choices for the text model; blanks use the sample-story fallback phrase. */
function storyForGeneration(
  story: string,
  styleSetupFields: Record<StyleSetupKey, string>,
  renderingType: RenderingTypeChoice,
  characterRepresentation: CharacterRepresentationChoice
): string {
  const block = buildFullStorySetupBlockForGeneration(
    styleSetupFields,
    renderingType,
    characterRepresentation
  )
  return `Theme, style & setup:\n${block}\n\n---\n\n${story}`
}

export default function App() {
  const [activeView, setActiveView] = useState<EditorViewId>('story')
  const [uiSummary, setUiSummary] = useState({
    textProviderLabel: 'Gemini',
    videoProviderLabel: 'Veo 2',
    settingsGearBadge: true
  })
  const [story, setStory] = useState('')
  const [styleSetupFields, setStyleSetupFields] = useState(emptyStyleSetupFields)
  const [renderingType, setRenderingType] = useState<RenderingTypeChoice>('')
  const [characterRepresentation, setCharacterRepresentation] =
    useState<CharacterRepresentationChoice>('')
  const [sessionId] = useState(() => crypto.randomUUID())

  const [charactersDoc, setCharactersDoc] = useState<CharactersDocument | null>(null)
  const charactersDocRef = useRef<CharactersDocument | null>(null)
  useEffect(() => {
    charactersDocRef.current = charactersDoc
  }, [charactersDoc])

  const [charactersGenError, setCharactersGenError] = useState<string | null>(null)
  const [charactersGenerating, setCharactersGenerating] = useState(false)
  const [charactersApproving, setCharactersApproving] = useState(false)
  /** Characters tab unlocks after Generate Characters is used, or when a sheet exists on disk. */
  const [storyPipelineActionTaken, setStoryPipelineActionTaken] = useState(false)
  /** After Insert Sample Story with a long sample, gently highlight Generate Characters in chat. */
  const [nudgeGenerateCharactersNext, setNudgeGenerateCharactersNext] = useState(false)
  const agentChatRef = useRef<AgentChatHandle>(null)
  /** Workspace tab to return to when leaving Settings (Back or activity bar). */
  const workspaceBeforeSettingsRef = useRef<WorkspaceViewId>('story')

  const openSettings = useCallback(() => {
    if (activeView !== 'settings') {
      workspaceBeforeSettingsRef.current = activeView as WorkspaceViewId
    }
    setActiveView('settings')
  }, [activeView])

  useEffect(() => {
    void window.api.charactersLoad(sessionId).then((d) => setCharactersDoc(d))
  }, [sessionId])

  const refreshUiSummary = useCallback(() => {
    void window.api.settingsUiSummary().then(setUiSummary)
  }, [])

  useEffect(() => {
    refreshUiSummary()
  }, [refreshUiSummary])

  useEffect(() => {
    return window.api.onSettingsUpdated(() => {
      refreshUiSummary()
    })
  }, [refreshUiSummary])

  useEffect(() => {
    if (countWords(story) <= LONG_STORY_WORD_THRESHOLD) {
      setNudgeGenerateCharactersNext(false)
    }
  }, [story])

  const charactersSheetLocked = Boolean(charactersDoc?.meta.locked)

  const [persistedFragments, setPersistedFragments] = useState<FragmentsDocument | null>(null)
  const clipsUnlocked = Boolean(persistedFragments?.meta.approved && persistedFragments?.meta.locked)
  const [projectStatus, setProjectStatus] = useState<string | undefined>(undefined)
  const [clipPipeline, setClipPipeline] = useState({ running: false, paused: false })

  const refreshProjectStatus = useCallback(() => {
    void window.api.projectStatus(sessionId).then(setProjectStatus)
  }, [sessionId])

  const onPersistedFragmentsChange = useCallback((doc: FragmentsDocument | null) => {
    setPersistedFragments(doc)
  }, [])

  useEffect(() => {
    void window.api.projectStatus(sessionId).then((s) => {
      setProjectStatus(s)
      if (s === 'clips_in_progress') {
        setActiveView('clips')
      }
    })
  }, [sessionId])

  useEffect(() => {
    return window.api.onClipsDocUpdate((p) => {
      if (p.sessionId !== sessionId) return
      setPersistedFragments(p.document)
      refreshProjectStatus()
    })
  }, [sessionId, refreshProjectStatus])

  useEffect(() => {
    return window.api.onClipsPipelineState((p) => {
      if (p.sessionId !== sessionId) return
      setClipPipeline({ running: p.running, paused: p.paused })
    })
  }, [sessionId])

  useEffect(() => {
    return window.api.onClipsLog((p) => {
      if (p.sessionId !== sessionId) return
      if (p.clipAction === 'proceed-video') {
        agentChatRef.current?.appendModelWithClipAction(p.text, 'proceed-video')
      } else {
        agentChatRef.current?.appendLine(p.kind, p.text)
      }
    })
  }, [sessionId])

  useEffect(() => {
    if (!charactersSheetLocked) {
      setPersistedFragments(null)
      return
    }
    let cancelled = false
    void window.api.fragmentsLoad(sessionId).then((doc) => {
      if (!cancelled) setPersistedFragments(doc)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, charactersSheetLocked])

  const goToSeedImages = useCallback(() => {
    setActiveView('seedImages')
  }, [])

  const onScriptBreakdownApproved = useCallback(() => {
    agentChatRef.current?.appendModelWithClipAction(
      'Your script breakdown is approved. Optionally add a seed image per clip on the Seed Images tab (or skip and generate from text only). When you are ready, open Clips to generate.',
      'proceed-clips'
    )
  }, [])

  const proceedFinalVideo = useCallback(() => {
    setActiveView('video')
  }, [])

  const onlyStoryUnlocked = !charactersDoc && !storyPipelineActionTaken

  const canApproveCharacters = Boolean(
    charactersDoc &&
      charactersDoc.characters.length > 0 &&
      !charactersDoc.meta.locked
  )

  const runGenerateCharacters = useCallback(async () => {
    const gate = await window.api.settingsValidateGeneration('characters')
    if (!gate.ok) {
      agentChatRef.current?.appendLine('error', gate.message)
      return
    }
    setNudgeGenerateCharactersNext(false)
    setStoryPipelineActionTaken(true)
    setCharactersGenError(null)
    agentChatRef.current?.appendLine('user', 'Generate Characters from the story')
    agentChatRef.current?.appendLine('model', 'Creating your characters from your story…')
    setCharactersGenerating(true)
    try {
      const charactersUserMessage = storyForGeneration(
        story,
        styleSetupFields,
        renderingType,
        characterRepresentation
      )
      console.log(
        '[StoryFlow] Generate Characters — user message sent to main (same string your text model receives as user content). Full request including systemInstruction is logged in the terminal where you ran the app.'
      )
      console.log(charactersUserMessage)
      const res = await window.api.charactersGenerate(sessionId, charactersUserMessage)
      if (res.ok) {
        setCharactersDoc(res.data)
        agentChatRef.current?.appendLine(
          'model',
          'All set — your characters are ready.\n\nOpen the Characters tab to review or change anything. When you are happy with them, approve them there to unlock the next step (script breakdown).'
        )
      } else {
        setCharactersGenError(res.error)
        agentChatRef.current?.appendLine('error', res.error)
      }
      setActiveView('characters')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setCharactersGenError(msg)
      agentChatRef.current?.appendLine('error', msg)
      setActiveView('characters')
    } finally {
      setCharactersGenerating(false)
    }
  }, [sessionId, story, styleSetupFields, renderingType, characterRepresentation])

  const runUnlockCharacters = useCallback(async () => {
    setCharactersGenError(null)
    agentChatRef.current?.appendLine('user', 'Unlock')
    agentChatRef.current?.appendLine('model', 'Unlocking your character sheet for editing…')
    setCharactersGenerating(true)
    try {
      const res = await window.api.charactersUnlock(sessionId)
      if (res.ok) {
        setCharactersDoc(res.data)
        setPersistedFragments(null)
        agentChatRef.current?.appendLine(
          'model',
          'Done — your characters are unlocked for editing. Saved script breakdown data was cleared; approve again when you are ready to continue.'
        )
      } else {
        setCharactersGenError(res.error)
        agentChatRef.current?.appendLine('error', res.error)
      }
      setActiveView('characters')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setCharactersGenError(msg)
      agentChatRef.current?.appendLine('error', msg)
      setActiveView('characters')
    } finally {
      setCharactersGenerating(false)
    }
  }, [sessionId])

  const runApproveFromChat = useCallback(async () => {
    const doc = charactersDocRef.current
    if (!doc || doc.meta.locked || doc.characters.length === 0) return
    setCharactersGenError(null)
    agentChatRef.current?.appendLine('user', 'Approve characters and continue')
    agentChatRef.current?.appendLine('model', 'Checking that everything looks good…')
    await delay(350)
    agentChatRef.current?.appendLine('model', 'Saving your choices…')
    setCharactersApproving(true)
    try {
      const res = await window.api.charactersApprove(sessionId, doc)
      if (res.ok) {
        setCharactersDoc(res.data)
        agentChatRef.current?.appendLine(
          'model',
          'You are all set — your characters are saved and the next step is unlocked. You can work on the Script Breakdown tab now. If you are happy with the Script Breakdown, you can approve it also and move forward.'
        )
        setActiveView('fragmentedScript')
      } else {
        setCharactersGenError(res.error)
        agentChatRef.current?.appendLine('error', res.error)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setCharactersGenError(msg)
      agentChatRef.current?.appendLine('error', msg)
    } finally {
      setCharactersApproving(false)
    }
  }, [sessionId])

  const onCharactersApproved = useCallback((d: CharactersDocument) => {
    setCharactersDoc(d)
    setCharactersGenError(null)
  }, [])

  const chatContext =
    activeView === 'story' ? 'story' : activeView === 'characters' ? 'characters' : 'other'

  const appendAgentLine = useCallback((kind: 'user' | 'model' | 'error', text: string) => {
    agentChatRef.current?.appendLine(kind, text)
  }, [])

  const storyGenerateDisabled = !story.trim() || charactersGenerating || charactersApproving

  let statusTail = 'AGENT READY'
  if (charactersGenerating) statusTail = 'GENERATING...'
  else if (charactersApproving) statusTail = 'APPROVING...'
  else if (clipPipeline.running) statusTail = 'CLIPS…'
  else if (charactersDoc?.meta.locked && charactersDoc.meta.approved) statusTail = 'LOCKED ✓'

  const workspaceTab: WorkspaceViewId | null =
    activeView === 'settings' ? null : activeView

  const beforeGenerateFragments = useCallback(async () => {
    const v = await window.api.settingsValidateGeneration('fragments')
    if (v.ok) return true
    appendAgentLine('error', v.message)
    return false
  }, [appendAgentLine])

  const beforeGenerateClips = useCallback(async () => {
    const v = await window.api.settingsValidateGeneration('clips')
    if (v.ok) return true
    appendAgentLine('error', v.message)
    return false
  }, [appendAgentLine])

  return (
    <div className="app-shell" role="application" aria-label="StoryFlow">
      <ActivityBar
        activeWorkspace={workspaceTab}
        onWorkspaceChange={(id) => setActiveView(id)}
        onlyStoryUnlocked={onlyStoryUnlocked}
        clipsUnlocked={clipsUnlocked}
        videoUnlocked={projectStatus === 'clips_done'}
        settingsGearActive={activeView === 'settings'}
        settingsGearBadge={uiSummary.settingsGearBadge}
        onOpenSettings={openSettings}
      />

      <div className="app-shell__editor">
        <MainWorkspace
          active={activeView}
          story={story}
          onStoryChange={setStory}
          styleSetupFields={styleSetupFields}
          onStyleSetupFieldChange={(key, value) =>
            setStyleSetupFields((prev) => ({ ...prev, [key]: value }))
          }
          onStyleSetupFieldsSample={() => {
            setStyleSetupFields({ ...SAMPLE_STYLE_SETUP_VALUES })
            setRenderingType(SAMPLE_RENDERING_TYPE)
            setCharacterRepresentation(SAMPLE_CHARACTER_REPRESENTATION)
          }}
          renderingType={renderingType}
          onRenderingTypeChange={setRenderingType}
          characterRepresentation={characterRepresentation}
          onCharacterRepresentationChange={setCharacterRepresentation}
          onSampleStoryInserted={(insertedText) => {
            if (countWords(insertedText) > LONG_STORY_WORD_THRESHOLD) {
              setNudgeGenerateCharactersNext(true)
            }
          }}
          onGenerateCharacters={() => void runGenerateCharacters()}
          storyGenerateDisabled={storyGenerateDisabled}
          gentlePulseGenerateCharacters={nudgeGenerateCharactersNext}
          sessionId={sessionId}
          charactersDocument={charactersDoc}
          charactersGenerating={charactersGenerating}
          charactersGenerateError={charactersGenError}
          onCharactersDocumentChange={setCharactersDoc}
          onRetryCharactersGenerate={() => void runGenerateCharacters()}
          onCharactersApproved={onCharactersApproved}
          onCharactersUnlock={() => void runUnlockCharacters()}
          charactersSheetLocked={charactersSheetLocked}
          onPersistedFragmentsChange={onPersistedFragmentsChange}
          onAppendAgentLine={appendAgentLine}
          onScriptBreakdownApproved={onScriptBreakdownApproved}
          onProceedToClipGeneration={goToSeedImages}
          onProceedToClipsFromSeeds={() => setActiveView('clips')}
          fragmentsDocument={persistedFragments}
          projectStatus={projectStatus}
          clipPipeline={clipPipeline}
          onRefreshProjectStatus={refreshProjectStatus}
          onProceedToFinalVideo={proceedFinalVideo}
          onSettingsSaved={refreshUiSummary}
          beforeGenerateFragments={beforeGenerateFragments}
          beforeGenerateClips={beforeGenerateClips}
          clipGeneratingLabel={`Generating with ${uiSummary.videoProviderLabel}…`}
          onCloseSettings={() => setActiveView(workspaceBeforeSettingsRef.current)}
        />
      </div>

      <div className="app-shell__chat">
        <AgentChat
          ref={agentChatRef}
          chatContext={chatContext}
          storyReady={story.trim().length > 0}
          charactersGenerating={charactersGenerating}
          charactersApproving={charactersApproving}
          canApproveCharacters={canApproveCharacters}
          onGenerateCharacters={() => void runGenerateCharacters()}
          gentlePulseGenerateCharacters={nudgeGenerateCharactersNext}
          onApproveCharactersFromChat={() => void runApproveFromChat()}
          clipsGenerating={clipPipeline.running}
          onProceedToClipGeneration={goToSeedImages}
          onProceedToFinalVideo={proceedFinalVideo}
        />
      </div>

      <footer className="app-shell__status" role="contentinfo">
        <span className="app-shell__status-left">StoryFlow · {sessionId.slice(0, 8)}</span>
        <span className="app-shell__status-right">
          Text: {uiSummary.textProviderLabel} · Video: {uiSummary.videoProviderLabel} ·{' '}
          {activeView === 'settings'
            ? 'SETTINGS'
            : workspaceStatusTag(activeView as WorkspaceViewId)}{' '}
          · {statusTail}
        </span>
      </footer>
    </div>
  )
}
