export type WorkspaceViewId =
  | 'story'
  | 'characters'
  | 'fragmentedScript'
  | 'clips'
  | 'video'

export const WORKSPACE_VIEWS: { id: WorkspaceViewId; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'characters', label: 'Characters' },
  { id: 'fragmentedScript', label: 'Script Breakdown' },
  { id: 'clips', label: 'Clips' },
  { id: 'video', label: 'Video' }
]

export function workspaceLabel(id: WorkspaceViewId): string {
  return WORKSPACE_VIEWS.find((v) => v.id === id)?.label ?? id
}

export function workspaceStatusTag(id: WorkspaceViewId): string {
  return workspaceLabel(id).toUpperCase()
}
