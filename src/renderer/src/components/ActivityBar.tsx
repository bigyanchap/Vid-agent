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
  active: WorkspaceViewId
  onActiveChange: (id: WorkspaceViewId) => void
  onlyStoryUnlocked: boolean
  clipsUnlocked: boolean
  onOpenSettings: () => void
}

export function ActivityBar({
  active,
  onActiveChange,
  onlyStoryUnlocked,
  clipsUnlocked,
  onOpenSettings
}: Props) {
  return (
    <aside className="activity-bar" aria-label="Activity bar">
      <div className="activity-bar__icons">
        {ITEMS.map(({ id, label, Icon }) => {
          const lockedCharacters = id === 'characters' && onlyStoryUnlocked
          const lockedClipsVideo = (id === 'clips' || id === 'video') && !clipsUnlocked
          const locked = lockedCharacters || lockedClipsVideo
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              className={`activity-icon-btn${isActive ? ' activity-icon-btn--active' : ''}`}
              disabled={locked}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onActiveChange(id)}
            >
              <Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden />
              <span className="activity-icon-btn__tooltip">{locked ? `${label} (locked)` : label}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="activity-icon-btn activity-icon-btn--settings"
        aria-label="Settings"
        onClick={onOpenSettings}
      >
        <Settings size={ICON_SIZE} strokeWidth={1.75} aria-hidden />
        <span className="activity-icon-btn__tooltip">Settings</span>
      </button>
    </aside>
  )
}
