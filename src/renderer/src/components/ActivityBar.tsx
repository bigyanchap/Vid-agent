import { FileText, Film, Scissors, Settings, Users, Video } from 'lucide-react'
import type { WorkspaceViewId } from '../workspace-views'

const ICON_SIZE = 18

type Item = {
  id: WorkspaceViewId
  label: string
  Icon: typeof FileText
}

const ITEMS: Item[] = [
  { id: 'story', label: 'Story', Icon: FileText },
  { id: 'characters', label: 'Characters', Icon: Users },
  { id: 'fragmentedScript', label: 'Script Breakdown', Icon: Film },
  { id: 'clips', label: 'Clips', Icon: Scissors },
  { id: 'video', label: 'Video', Icon: Video }
]

type Props = {
  /** Which workspace tab is highlighted; null when Settings page is open. */
  activeWorkspace: WorkspaceViewId | null
  onWorkspaceChange: (id: WorkspaceViewId) => void
  onlyStoryUnlocked: boolean
  clipsUnlocked: boolean
  videoUnlocked: boolean
  settingsGearActive: boolean
  settingsGearBadge: boolean
  onOpenSettings: () => void
}

export function ActivityBar({
  activeWorkspace,
  onWorkspaceChange,
  onlyStoryUnlocked,
  clipsUnlocked,
  videoUnlocked,
  settingsGearActive,
  settingsGearBadge,
  onOpenSettings
}: Props) {
  return (
    <aside className="activity-bar" aria-label="Activity bar">
      <div className="activity-bar__icons">
        {ITEMS.map(({ id, label, Icon }) => {
          const lockedCharacters = id === 'characters' && onlyStoryUnlocked
          const lockedClips = id === 'clips' && !clipsUnlocked
          const lockedVideo = id === 'video' && !videoUnlocked
          const lockedClipsVideo = lockedClips || lockedVideo
          const locked = lockedCharacters || lockedClipsVideo
          const isActive = activeWorkspace !== null && activeWorkspace === id
          return (
            <button
              key={id}
              type="button"
              className={`activity-icon-btn${isActive ? ' activity-icon-btn--active' : ''}`}
              disabled={locked}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onWorkspaceChange(id)}
            >
              <Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden />
              <span className="activity-icon-btn__tooltip">{locked ? `${label} (locked)` : label}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className={`activity-icon-btn activity-icon-btn--settings${settingsGearActive ? ' activity-icon-btn--active' : ''}`}
        aria-label="Settings"
        aria-current={settingsGearActive ? 'page' : undefined}
        onClick={onOpenSettings}
      >
        <span className="activity-icon-btn__settings-wrap">
          <Settings size={ICON_SIZE} strokeWidth={1.75} aria-hidden />
          {settingsGearBadge && (
            <span className="activity-icon-btn__badge" aria-hidden title="Add missing API keys in Settings" />
          )}
        </span>
        <span className="activity-icon-btn__tooltip">Settings</span>
      </button>
    </aside>
  )
}
