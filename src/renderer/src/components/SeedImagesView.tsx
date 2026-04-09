import { useCallback, useEffect, useRef, useState } from 'react'
import type { FragmentFrame, FragmentsDocument } from '@shared/fragments-types'

type Props = {
  sessionId: string
  fragmentsDocument: FragmentsDocument | null
  onProceedToClips: () => void
  onAppendAgentLine?: (kind: 'user' | 'model' | 'error', text: string) => void
}

export function SeedImagesView({
  sessionId,
  fragmentsDocument,
  onProceedToClips,
  onAppendAgentLine
}: Props) {
  const frames = fragmentsDocument?.frames ?? []
  const [mediaUrls, setMediaUrls] = useState<Record<number, string>>({})
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetFrameId = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const next: Record<number, string> = {}
    void (async () => {
      for (const f of frames) {
        if (f.seed_image_path) {
          const url = await window.api.clipsMediaUrl(sessionId, f.seed_image_path)
          if (!cancelled) next[f.frame_id] = url
        }
      }
      if (!cancelled) setMediaUrls(next)
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, frames])

  const onUploadClick = useCallback((frameId: number) => {
    uploadTargetFrameId.current = frameId
    fileInputRef.current?.click()
  }, [])

  const onFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      const frameId = uploadTargetFrameId.current
      e.target.value = ''
      uploadTargetFrameId.current = null
      if (!file || frameId == null) return

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        if (typeof dataUrl !== 'string') return
        void (async () => {
          const res = await window.api.seedImageUpload(sessionId, frameId, dataUrl)
          if (!res.ok) {
            onAppendAgentLine?.('error', res.error)
          }
        })()
      }
      reader.readAsDataURL(file)
    },
    [sessionId, onAppendAgentLine]
  )

  const onGenerate = useCallback(
    async (frameId: number) => {
      setGeneratingId(frameId)
      try {
        const res = await window.api.seedImageGenerate(sessionId, frameId)
        if (!res.ok) {
          onAppendAgentLine?.('error', res.error)
        }
      } finally {
        setGeneratingId(null)
      }
    },
    [sessionId, onAppendAgentLine]
  )

  const onClear = useCallback(
    async (frameId: number) => {
      const res = await window.api.seedImageClear(sessionId, frameId)
      if (!res.ok) {
        onAppendAgentLine?.('error', res.error)
      }
    },
    [sessionId, onAppendAgentLine]
  )

  if (!fragmentsDocument?.meta.approved || !fragmentsDocument.meta.locked) {
    return (
      <div className="clips-panel">
        <p className="editor-section-label">Seed Images</p>
        <p className="clips-panel__hint">Approve the script breakdown first to add optional seed images.</p>
      </div>
    )
  }

  return (
    <div className="clips-panel seed-images-panel">
      <input
        ref={fileInputRef}
        type="file"
        className="seed-images-panel__file-input"
        accept="image/png,image/jpeg,image/webp"
        aria-hidden
        tabIndex={-1}
        onChange={onFileSelected}
      />

      <p className="editor-section-label">Seed Images</p>
      <p className="seed-images-panel__lead">
        This step is optional. If you add a seed image for a clip, video generation starts from that frame (Veo
        image-to-video; fallback path uses your still). If you skip it, clips are generated from text only.
      </p>
      <p className="seed-images-panel__sub">
        Upload your own image, or generate a still with your image model (uses the same prompt as clip generation).
      </p>

      <div className="clips-panel__controls seed-images-panel__controls">
        <span className="clips-panel__controls-label">READY FOR CLIPS</span>
        <button
          type="button"
          className="clips-panel__btn clips-panel__btn--solid"
          onClick={onProceedToClips}
        >
          Continue to Clips →
        </button>
      </div>

      <div className="clips-panel__grid">
        {[...frames]
          .sort((a, b) => a.frame_id - b.frame_id)
          .map((frame) => (
            <SeedFrameCard
              key={frame.frame_id}
              frame={frame}
              previewUrl={mediaUrls[frame.frame_id] ?? null}
              generating={generatingId === frame.frame_id}
              onUpload={() => onUploadClick(frame.frame_id)}
              onGenerate={() => void onGenerate(frame.frame_id)}
              onClear={() => void onClear(frame.frame_id)}
            />
          ))}
      </div>
    </div>
  )
}

function SeedFrameCard({
  frame,
  previewUrl,
  generating,
  onUpload,
  onGenerate,
  onClear
}: {
  frame: FragmentFrame
  previewUrl: string | null
  generating: boolean
  onUpload: () => void
  onGenerate: () => void
  onClear: () => void
}) {
  const hasPath = Boolean(frame.seed_image_path)

  return (
    <article className="clip-card seed-images-panel__card">
      <div className="clip-card__video seed-images-panel__preview">
        {hasPath && previewUrl ? (
          <img className="seed-images-panel__img" src={previewUrl} alt="" />
        ) : hasPath && !previewUrl ? (
          <div className="seed-images-panel__placeholder">
            <div className="clip-card__spinner" aria-hidden />
            <span className="clip-card__pending-num">Loading preview…</span>
          </div>
        ) : (
          <div className="seed-images-panel__placeholder">
            <span className="clip-card__pending-num">Frame {frame.frame_id}</span>
            <p className="clip-card__pending-desc">No seed image</p>
          </div>
        )}
        {generating && (
          <div className="clip-card__video clip-card__video--generating seed-images-panel__generating">
            <div className="clip-card__generating-inner">
              <div className="clip-card__spinner" aria-hidden />
              <span>Generating…</span>
            </div>
          </div>
        )}
      </div>
      <div className="clip-card__info">
        <div className="clip-card__row1">
          <span className="clip-card__frame-label">Frame {frame.frame_id}</span>
        </div>
        <div className="clip-card__row2">{frame.scene_description?.slice(0, 120) || '—'}</div>
        <div className="seed-images-panel__actions">
          <button type="button" className="seed-images-panel__btn" disabled={generating} onClick={onUpload}>
            Upload
          </button>
          <button type="button" className="seed-images-panel__btn" disabled={generating} onClick={onGenerate}>
            Generate
          </button>
          <button
            type="button"
            className="seed-images-panel__btn seed-images-panel__btn--ghost"
            disabled={generating || !frame.seed_image_path}
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>
    </article>
  )
}
