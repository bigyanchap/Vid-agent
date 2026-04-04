import { useCallback, useEffect, useRef, useState } from 'react'
import type { CharactersDocument } from '@shared/characters-types'
import {
  buildStyleSetupBlockForGeneration,
  SAMPLE_STYLE_SETUP_VALUES,
  type StyleSetupKey,
  STYLE_SETUP_KEYS
} from './sample-story'
import { AgentChat, type AgentChatHandle } from './components/AgentChat'
import { MainWorkspace, type WorkspaceViewId } from './components/MainWorkspace'
import { SettingsModal } from './components/SettingsModal'

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

/** Prepends Theme / Style / … block for Gemini; empty inputs use the sample-story fallback phrase. */
function storyForGeneration(story: string, styleSetupFields: Record<StyleSetupKey, string>): string {
  const block = buildStyleSetupBlockForGeneration(styleSetupFields)
  return `Theme, style & setup:\n${block}\n\n---\n\n${story}`
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeView, setActiveView] = useState<WorkspaceViewId>('story')
  const [story, setStory] = useState('')
  const [styleSetupFields, setStyleSetupFields] = useState(emptyStyleSetupFields)
  const [sessionId] = useState(() => crypto.randomUUID())

  const [charactersDoc, setCharactersDoc] = useState<CharactersDocument | null>(null)
  const charactersDocRef = useRef<CharactersDocument | null>(null)
  useEffect(() => {
    charactersDocRef.current = charactersDoc
  }, [charactersDoc])

  const [charactersGenError, setCharactersGenError] = useState<string | null>(null)
  const [charactersGenerating, setCharactersGenerating] = useState(false)
  const [charactersApproving, setCharactersApproving] = useState(false)
  const [wholeVideoPending, setWholeVideoPending] = useState(false)
  /** Characters tab unlocks after Generate Characters or whole-video suggestion is used, or when a sheet exists on disk. */
  const [storyPipelineActionTaken, setStoryPipelineActionTaken] = useState(false)
  /** After Insert Sample Story with a long sample, gently highlight Generate Characters in chat. */
  const [nudgeGenerateCharactersNext, setNudgeGenerateCharactersNext] = useState(false)
  const agentChatRef = useRef<AgentChatHandle>(null)

  useEffect(() => {
    void window.api.charactersLoad(sessionId).then((d) => setCharactersDoc(d))
  }, [sessionId])

  useEffect(() => {
    if (countWords(story) <= LONG_STORY_WORD_THRESHOLD) {
      setNudgeGenerateCharactersNext(false)
    }
  }, [story])

  const fragmentedScriptUnlocked = Boolean(charactersDoc?.meta.approved && charactersDoc?.meta.locked)

  const onlyStoryUnlocked = !charactersDoc && !storyPipelineActionTaken

  const canApproveCharacters = Boolean(
    charactersDoc &&
      charactersDoc.characters.length > 0 &&
      !charactersDoc.meta.locked
  )

  const runGenerateCharacters = useCallback(async () => {
    setNudgeGenerateCharactersNext(false)
    setStoryPipelineActionTaken(true)
    setCharactersGenError(null)
    agentChatRef.current?.appendLine('user', 'Generate Characters from the story')
    agentChatRef.current?.appendLine('model', 'Creating your characters from your story…')
    setCharactersGenerating(true)
    try {
      const res = await window.api.charactersGenerate(
        sessionId,
        storyForGeneration(story, styleSetupFields)
      )
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
  }, [sessionId, story, styleSetupFields])

  const runUnlockCharacters = useCallback(async () => {
    setCharactersGenError(null)
    agentChatRef.current?.appendLine('user', 'Unlock')
    agentChatRef.current?.appendLine('model', 'Unlocking your character sheet for editing…')
    setCharactersGenerating(true)
    try {
      const res = await window.api.charactersUnlock(sessionId)
      if (res.ok) {
        setCharactersDoc(res.data)
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

  const runGenerateWholeVideo = useCallback(async () => {
    const t = story.trim()
    if (!t) return
    setStoryPipelineActionTaken(true)
    agentChatRef.current?.appendLine('user', 'Generate whole video at once from the story')
    agentChatRef.current?.appendLine('model', 'Reading your story…')
    await delay(400)
    agentChatRef.current?.appendLine('model', 'Planning scenes and pacing…')
    await delay(450)
    agentChatRef.current?.appendLine('model', 'Resolving characters and continuity…')
    setWholeVideoPending(true)
    await delay(900)
    setWholeVideoPending(false)
    agentChatRef.current?.appendLine(
      'model',
      'Making the whole video in one go is not available in this version yet. For now, use Generate Characters from story, then review and approve on the Characters tab to move forward.'
    )
  }, [story])

  const onCharactersApproved = useCallback((d: CharactersDocument) => {
    setCharactersDoc(d)
    setCharactersGenError(null)
  }, [])

  const chatContext =
    activeView === 'story' ? 'story' : activeView === 'characters' ? 'characters' : 'other'

  const appendAgentLine = useCallback((kind: 'user' | 'model' | 'error', text: string) => {
    agentChatRef.current?.appendLine(kind, text)
  }, [])

  return (
    <div className="workbench" role="application" aria-label="Vid-Agent">
      <header className="workbench__header">
        <h1 className="workbench__title">
          Vid-Agent <span className="workbench__subtitle">— An Agentic Video Generator</span>
        </h1>
      </header>

      <div className="workbench__body">
        <aside className="activity-bar" aria-label="Activity bar">
          <div className="activity-bar__spacer" />
          <button
            type="button"
            className="activity-bar__settings"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <svg className="activity-bar__gear" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
          </button>
        </aside>

        <div className="workbench__editor-pane">
          <MainWorkspace
            active={activeView}
            onActiveChange={setActiveView}
            story={story}
            onStoryChange={setStory}
            styleSetupFields={styleSetupFields}
            onStyleSetupFieldChange={(key, value) =>
              setStyleSetupFields((prev) => ({ ...prev, [key]: value }))
            }
            onStyleSetupFieldsSample={() => setStyleSetupFields({ ...SAMPLE_STYLE_SETUP_VALUES })}
            onSampleStoryInserted={(insertedText) => {
              if (countWords(insertedText) > LONG_STORY_WORD_THRESHOLD) {
                setNudgeGenerateCharactersNext(true)
              }
            }}
            sessionId={sessionId}
            charactersDocument={charactersDoc}
            charactersGenerating={charactersGenerating}
            charactersGenerateError={charactersGenError}
            onCharactersDocumentChange={setCharactersDoc}
            onRetryCharactersGenerate={() => void runGenerateCharacters()}
            onCharactersApproved={onCharactersApproved}
            onCharactersUnlock={() => void runUnlockCharacters()}
            fragmentedScriptUnlocked={fragmentedScriptUnlocked}
            onlyStoryUnlocked={onlyStoryUnlocked}
            onAppendAgentLine={appendAgentLine}
          />
        </div>

        <div className="workbench__chat-pane">
          <AgentChat
            ref={agentChatRef}
            chatContext={chatContext}
            storyReady={story.trim().length > 0}
            charactersGenerating={charactersGenerating}
            charactersApproving={charactersApproving}
            wholeVideoPending={wholeVideoPending}
            canApproveCharacters={canApproveCharacters}
            onGenerateCharacters={() => void runGenerateCharacters()}
            gentlePulseGenerateCharacters={nudgeGenerateCharactersNext}
            onGenerateWholeVideo={() => void runGenerateWholeVideo()}
            onApproveCharactersFromChat={() => void runApproveFromChat()}
          />
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
