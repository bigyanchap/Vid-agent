import { useCallback, useEffect, useRef, useState } from 'react'
import type { CharactersDocument } from '@shared/characters-types'
import { AgentChat, type AgentChatHandle } from './components/AgentChat'
import { MainWorkspace, type WorkspaceViewId } from './components/MainWorkspace'
import { SettingsModal } from './components/SettingsModal'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeView, setActiveView] = useState<WorkspaceViewId>('story')
  const [story, setStory] = useState('')
  const [sessionId] = useState(() => crypto.randomUUID())

  const [charactersDoc, setCharactersDoc] = useState<CharactersDocument | null>(null)
  const [charactersGenError, setCharactersGenError] = useState<string | null>(null)
  const [charactersGenerating, setCharactersGenerating] = useState(false)
  const agentChatRef = useRef<AgentChatHandle>(null)

  useEffect(() => {
    void window.api.charactersLoad(sessionId).then((d) => setCharactersDoc(d))
  }, [sessionId])

  const fragmentedScriptUnlocked = Boolean(charactersDoc?.meta.approved && charactersDoc?.meta.locked)

  const runGenerateCharacters = useCallback(async () => {
    setCharactersGenError(null)
    agentChatRef.current?.appendLine('user', 'Generate Characters and Fragments')
    agentChatRef.current?.appendLine('model', 'Starting character generation…')
    setCharactersGenerating(true)
    const res = await window.api.charactersGenerate(sessionId, story)
    setCharactersGenerating(false)
    if (res.ok) {
      setCharactersDoc(res.data)
      agentChatRef.current?.appendLine(
        'model',
        `Done. Character data was saved to:\n${res.savedPath}\n\nOpen the Characters tab to review and edit. After you approve there, Fragmented Script unlocks.`
      )
    } else {
      setCharactersGenError(res.error)
      agentChatRef.current?.appendLine('error', res.error)
    }
    setActiveView('characters')
  }, [sessionId, story])

  const onCharactersApproved = useCallback((d: CharactersDocument) => {
    setCharactersDoc(d)
    setCharactersGenError(null)
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
            sessionId={sessionId}
            charactersDocument={charactersDoc}
            charactersGenerating={charactersGenerating}
            charactersGenerateError={charactersGenError}
            onCharactersDocumentChange={setCharactersDoc}
            onRetryCharactersGenerate={() => void runGenerateCharacters()}
            onCharactersApproved={onCharactersApproved}
            fragmentedScriptUnlocked={fragmentedScriptUnlocked}
          />
        </div>

        <div className="workbench__chat-pane">
          <AgentChat
            ref={agentChatRef}
            showStorySuggestions={activeView === 'story'}
            storyReady={story.trim().length > 0}
            charactersGenerating={charactersGenerating}
            onGenerateCharacters={() => void runGenerateCharacters()}
          />
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
