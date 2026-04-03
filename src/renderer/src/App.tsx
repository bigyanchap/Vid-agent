import { useState } from 'react'
import { AgentChat } from './components/AgentChat'
import { MainWorkspace, type WorkspaceViewId } from './components/MainWorkspace'
import { SettingsModal } from './components/SettingsModal'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeView, setActiveView] = useState<WorkspaceViewId>('story')
  const [story, setStory] = useState('')

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
          />
        </div>

        <div className="workbench__chat-pane">
          <AgentChat showStorySuggestions={activeView === 'story'} />
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
