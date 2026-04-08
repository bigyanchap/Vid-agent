import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CharactersDocument } from '@shared/characters-types'
import type { FragmentFrame, FragmentsDocument } from '@shared/fragments-types'

type Props = {
  sessionId: string
  fragmentsDocument: FragmentsDocument | null
  charactersDocument: CharactersDocument | null
  projectStatus: string | undefined
  clipPipeline: { running: boolean; paused: boolean }
  onRefreshProjectStatus: () => void
  onProceedToFinalVideo: () => void
  /** Return false to abort starting / resuming clip generation (caller posts agent chat error). */
  beforeGenerateClips?: () => Promise<boolean>
  clipGeneratingLabel?: string
}

function statusKey(s: string): string {
  return s.trim().toLowerCase()
}

function badgeVariant(status: string): string {
  const u = statusKey(status)
  if (u === 'generating') return 'generating'
  if (u === 'done') return 'done'
  if (u === 'failed') return 'failed'
  return 'pending'
}

function badgeLabel(status: string): string {
  const u = statusKey(status)
  if (u === 'generating') return 'GENERATING'
  if (u === 'done') return 'DONE'
  if (u === 'failed') return 'FAILED'
  return 'PENDING'
}

function characterNames(frame: FragmentFrame, chars: CharactersDocument | null): string {
  if (!chars?.characters?.length || !frame.characters_present?.length) return '—'
  const map = new Map(chars.characters.map((c) => [c.id, c.name || c.id]))
  return frame.characters_present
    .map((id) => map.get(id) || id)
    .join(', ')
}

function ClipVideoPanel({
  frame,
  mediaUrl,
  generatingLabel
}: {
  frame: FragmentFrame
  mediaUrl: string | null
  generatingLabel: string
}) {
  const st = statusKey(frame.status)
  if (st === 'done' && mediaUrl) {
    return (
      <div className="clip-card__video clip-card__video--done">
        {frame.used_fallback && <span className="clip-card__fallback-badge">FALLBACK</span>}
        <video className="clip-card__video-el" src={mediaUrl} muted loop autoPlay playsInline controls />
      </div>
    )
  }
  if (st === 'generating') {
    return (
      <div className="clip-card__video clip-card__video--generating">
        <div className="clip-card__generating-inner">
          <div className="clip-card__spinner" aria-hidden />
          <span>{generatingLabel}</span>
        </div>
      </div>
    )
  }
  if (st === 'failed') {
    return (
      <div className="clip-card__video clip-card__video--failed">
        <span className="clip-card__failed-label">⚠ Failed</span>
      </div>
    )
  }
  return (
    <div className="clip-card__video clip-card__video--pending">
      <span className="clip-card__pending-num">Frame {frame.frame_id}</span>
      <p className="clip-card__pending-desc">{frame.scene_description || '—'}</p>
    </div>
  )
}

export function ClipsView({
  sessionId,
  fragmentsDocument,
  charactersDocument,
  projectStatus,
  clipPipeline,
  onRefreshProjectStatus,
  onProceedToFinalVideo,
  beforeGenerateClips,
  clipGeneratingLabel = 'Generating clip…'
}: Props) {
  const frames = fragmentsDocument?.frames ?? []
  const total = frames.length
  const processedCount = frames.filter((f) => {
    const u = statusKey(f.status)
    return u === 'done' || u === 'failed'
  }).length
  const allFinished = total > 0 && processedCount >= total
  const [mediaUrls, setMediaUrls] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false
    const next: Record<number, string> = {}
    void (async () => {
      for (const f of frames) {
        if (statusKey(f.status) === 'done' && f.video_path) {
          const url = await window.api.clipsMediaUrl(sessionId, f.video_path)
          if (!cancelled) next[f.frame_id] = url
        }
      }
      if (!cancelled) setMediaUrls(next)
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, frames])

  const progress = total > 0 ? (processedCount / total) * 100 : 0

  const showResume =
    !clipPipeline.running &&
    !allFinished &&
    (projectStatus === 'clips_in_progress' || clipPipeline.paused) &&
    total > 0

  const primaryControl = useMemo(() => {
    if (allFinished) {
      return { kind: 'proceed' as const, label: 'Proceed to Final Video →' }
    }
    if (clipPipeline.running) {
      return { kind: 'pause' as const, label: 'Pause' }
    }
    if (showResume) {
      return { kind: 'resume' as const, label: 'Resume' }
    }
    return { kind: 'start' as const, label: 'Generate All Clips' }
  }, [allFinished, clipPipeline.running, showResume])

  const onPrimary = useCallback(async () => {
    if (primaryControl.kind === 'proceed') {
      onProceedToFinalVideo()
      return
    }
    if (primaryControl.kind === 'pause') {
      await window.api.clipsPause()
      return
    }
    if (beforeGenerateClips && (primaryControl.kind === 'resume' || primaryControl.kind === 'start')) {
      const ok = await beforeGenerateClips()
      if (!ok) return
    }
    if (primaryControl.kind === 'resume') {
      await window.api.clipsResume(sessionId)
      onRefreshProjectStatus()
      return
    }
    if (primaryControl.kind === 'start') {
      await window.api.clipsStart(sessionId)
      onRefreshProjectStatus()
      return
    }
  }, [
    primaryControl.kind,
    onProceedToFinalVideo,
    onRefreshProjectStatus,
    sessionId,
    beforeGenerateClips
  ])

  const onRetry = useCallback(
    async (frameId: number) => {
      await window.api.clipsRegenerate(sessionId, frameId)
      onRefreshProjectStatus()
    },
    [sessionId, onRefreshProjectStatus]
  )

  if (!fragmentsDocument?.meta.approved || !fragmentsDocument.meta.locked) {
    return (
      <div className="clips-panel">
        <p className="editor-section-label">Clips</p>
        <p className="clips-panel__hint">Approve the script breakdown first to generate clips.</p>
      </div>
    )
  }

  return (
    <div className="clips-panel">
      <div className="clips-panel__progress-track" aria-hidden>
        <div className="clips-panel__progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="clips-panel__progress-meta">
        {processedCount}/{total} frames
      </div>

      <div className="clips-panel__controls">
        <span className="clips-panel__controls-label">
          CLIP GENERATION · {processedCount}/{total} frames
        </span>
        <button
          type="button"
          className={
            primaryControl.kind === 'pause'
              ? 'clips-panel__btn clips-panel__btn--outline'
              : 'clips-panel__btn clips-panel__btn--solid'
          }
          disabled={total === 0}
          onClick={() => void onPrimary()}
        >
          {primaryControl.label}
        </button>
      </div>

      <div className="clips-panel__grid">
        {[...frames]
          .sort((a, b) => a.frame_id - b.frame_id)
          .map((frame) => (
            <article key={frame.frame_id} className="clip-card">
              <ClipVideoPanel
                frame={frame}
                mediaUrl={mediaUrls[frame.frame_id] ?? null}
                generatingLabel={clipGeneratingLabel}
              />
              <div className="clip-card__info">
                <div className="clip-card__row1">
                  <span className="clip-card__frame-label">Frame {frame.frame_id}</span>
                  <div className="clip-card__badges">
                    {frame.used_fallback && (
                      <span className="fragment-card__badge fragment-card__badge--fallback">FALLBACK</span>
                    )}
                    <span
                      className={`fragment-card__badge fragment-card__badge--${badgeVariant(frame.status)}${statusKey(frame.status) === 'generating' ? ' fragment-card__badge--pulse' : ''}`}
                    >
                      {badgeLabel(frame.status)}
                    </span>
                  </div>
                </div>
                <div className="clip-card__row2">
                  {frame.camera_hint} · {frame.duration_seconds}s · {frame.transition}
                </div>
                <div className="clip-card__row3" title={characterNames(frame, charactersDocument)}>
                  {characterNames(frame, charactersDocument)}
                </div>
                {statusKey(frame.status) === 'failed' && (
                  <button
                    type="button"
                    className="clip-card__retry"
                    onClick={() => void onRetry(frame.frame_id)}
                  >
                    Retry
                  </button>
                )}
                {statusKey(frame.status) === 'done' && (
                  <button
                    type="button"
                    className="clip-card__regenerate"
                    onClick={() => void onRetry(frame.frame_id)}
                  >
                    Regenerate
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
    </div>
  )
}
