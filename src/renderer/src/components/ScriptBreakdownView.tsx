import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CharactersDocument } from '@shared/characters-types'
import type { FragmentDialogueLine, FragmentFrame, FragmentsDocument, FragmentsMeta } from '@shared/fragments-types'
import { renumberFragmentFrames } from '@shared/fragments-types'
import type { CharacterRepresentationChoice, RenderingTypeChoice, StyleSetupKey } from '../sample-story'
import './CharactersView.css'

type LocalFragmentFrame = FragmentFrame & { clientId: string }

const CAMERA_OPTIONS = [
  'wide shot',
  'medium shot',
  'close-up',
  'overhead',
  'low angle',
  'tracking shot'
] as const

const DURATION_OPTIONS = [4, 6, 8] as const

const TRANSITION_OPTIONS = ['cut', 'fade', 'dissolve'] as const

function pickCamera(v: string): string {
  return (CAMERA_OPTIONS as readonly string[]).includes(v) ? v : 'wide shot'
}

function pickTransition(v: string): string {
  return (TRANSITION_OPTIONS as readonly string[]).includes(v) ? v : 'cut'
}

function pickDuration(v: number): 4 | 6 | 8 {
  return v === 4 || v === 6 || v === 8 ? v : 6
}

function normalizeFragmentFrame(f: FragmentFrame): FragmentFrame {
  return {
    ...f,
    camera_hint: pickCamera(f.camera_hint),
    transition: pickTransition(f.transition),
    duration_seconds: pickDuration(f.duration_seconds)
  }
}

function attachClientIds(frames: FragmentFrame[]): LocalFragmentFrame[] {
  return frames.map((f) => ({ ...normalizeFragmentFrame(f), clientId: crypto.randomUUID() }))
}

function stripClientIds(frames: LocalFragmentFrame[]): FragmentFrame[] {
  return frames.map(({ clientId: _c, ...f }) => f)
}

function buildDocument(meta: FragmentsMeta, frames: LocalFragmentFrame[]): FragmentsDocument {
  const raw = renumberFragmentFrames(stripClientIds(frames))
  const estimated = raw.reduce((s, f) => s + f.duration_seconds, 0)
  return {
    meta: {
      ...meta,
      total_frames: raw.length,
      estimated_duration_seconds: estimated
    },
    frames: raw
  }
}

function badgeClassForStatus(status: string): string {
  const u = status.trim().toLowerCase()
  if (u === 'generating') return 'generating'
  if (u === 'done') return 'done'
  return 'pending'
}

function badgeLabelForStatus(status: string): string {
  const u = status.trim().toLowerCase()
  if (u === 'generating') return 'GENERATING'
  if (u === 'done') return 'DONE'
  return 'PENDING'
}

type Props = {
  sessionId: string
  /** Script breakdown UI enabled only when characters.json has meta.locked true */
  charactersSheetLocked: boolean
  story: string
  styleSetupFields: Record<StyleSetupKey, string>
  renderingType: RenderingTypeChoice
  characterRepresentation: CharacterRepresentationChoice
  charactersDocument: CharactersDocument | null
  onPersistedFragmentsChange: (doc: FragmentsDocument | null) => void
  onAppendAgentLine: (kind: 'user' | 'model' | 'error', text: string) => void
}

export function ScriptBreakdownView({
  sessionId,
  charactersSheetLocked,
  story,
  styleSetupFields,
  renderingType,
  characterRepresentation,
  charactersDocument,
  onPersistedFragmentsChange,
  onAppendAgentLine
}: Props) {
  const [meta, setMeta] = useState<FragmentsMeta | null>(null)
  const [frames, setFrames] = useState<LocalFragmentFrame[]>([])
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [approving, setApproving] = useState(false)
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const [prevLocked, setPrevLocked] = useState(false)

  const framesRef = useRef(frames)
  const metaRef = useRef(meta)
  useEffect(() => {
    framesRef.current = frames
  }, [frames])
  useEffect(() => {
    metaRef.current = meta
  }, [meta])

  const fragmentsLocked = Boolean(meta?.locked)
  const sortableIds = frames.map((f) => f.clientId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const reloadFromDisk = useCallback(async () => {
    const doc = await window.api.fragmentsLoad(sessionId)
    if (doc) {
      setMeta(doc.meta)
      setFrames(attachClientIds(doc.frames))
      onPersistedFragmentsChange(doc)
    } else {
      setMeta(null)
      setFrames([])
      onPersistedFragmentsChange(null)
    }
    setDirtyIds(new Set())
    setGenError(null)
    setSaveError(null)
  }, [sessionId, onPersistedFragmentsChange])

  useEffect(() => {
    if (!charactersSheetLocked) return
    void reloadFromDisk()
  }, [charactersSheetLocked, sessionId, reloadFromDisk])

  useEffect(() => {
    if (charactersSheetLocked && !prevLocked) {
      setPulse(true)
    }
    setPrevLocked(charactersSheetLocked)
  }, [charactersSheetLocked, prevLocked])

  const markDirty = useCallback((clientId: string) => {
    setDirtyIds((prev) => new Set(prev).add(clientId))
  }, [])

  const persistDocument = useCallback(
    async (doc: FragmentsDocument) => {
      const res = await window.api.fragmentsSave(sessionId, doc)
      if (!res.ok) {
        setSaveError(res.error)
        return false
      }
      setSaveError(null)
      onPersistedFragmentsChange(doc)
      return true
    },
    [sessionId, onPersistedFragmentsChange]
  )

  const saveFrameCard = useCallback(
    async (clientId: string) => {
      const m = metaRef.current
      if (!m) return
      const ok = await persistDocument(buildDocument(m, framesRef.current))
      if (ok) {
        setDirtyIds((prev) => {
          const n = new Set(prev)
          n.delete(clientId)
          return n
        })
        setSavedFlashId(clientId)
        window.setTimeout(() => setSavedFlashId((id) => (id === clientId ? null : id)), 1500)
      }
    },
    [persistDocument]
  )

  const runGenerate = useCallback(async () => {
    setGenError(null)
    setGenerating(true)
    onAppendAgentLine('user', 'Generate Script Breakdown')
    onAppendAgentLine('model', 'Parsing your story into cinematic frames…')
    try {
      const world_settings = {
        visual_style: renderingType ?? '',
        theme: styleSetupFields.Theme ?? '',
        setup: styleSetupFields.Setup ?? '',
        mood: styleSetupFields.Mood ?? '',
        era: styleSetupFields.Era ?? '',
        world: styleSetupFields.World ?? '',
        constraints: styleSetupFields.Constraints ?? ''
      }
      const res = await window.api.fragmentsGenerate({
        sessionId,
        story: story.trim(),
        visual_style: renderingType ?? '',
        character_representation: characterRepresentation ?? '',
        world_settings
      })
      if (res.ok) {
        setMeta(res.data.meta)
        setFrames(attachClientIds(res.data.frames))
        setDirtyIds(new Set())
        onPersistedFragmentsChange(res.data)
        onAppendAgentLine('model', 'Script breakdown is ready. Review frames or edit details, then approve when you are ready for clips.')
      } else {
        setGenError(res.error)
        onAppendAgentLine('error', res.error)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setGenError(msg)
      onAppendAgentLine('error', msg)
    } finally {
      setGenerating(false)
    }
  }, [
    sessionId,
    story,
    styleSetupFields,
    renderingType,
    characterRepresentation,
    onAppendAgentLine,
    onPersistedFragmentsChange
  ])

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const m = metaRef.current
      if (fragmentsLocked || !m) return
      const { active, over } = event
      if (!over || active.id === over.id) return
      const cur = framesRef.current
      const oldIndex = cur.findIndex((f) => f.clientId === active.id)
      const newIndex = cur.findIndex((f) => f.clientId === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const moved = arrayMove(cur, oldIndex, newIndex).map((f, i) => ({ ...f, frame_id: i + 1 }))
      setFrames(moved)
      framesRef.current = moved
      const doc = buildDocument(m, moved)
      await persistDocument(doc)
    },
    [fragmentsLocked, persistDocument]
  )

  const runApprove = useCallback(async () => {
    const m = metaRef.current
    const cur = framesRef.current
    if (!m || cur.length === 0) return
    setApproving(true)
    setSaveError(null)
    try {
      const flush = buildDocument(m, cur)
      const saveFirst = await window.api.fragmentsSave(sessionId, flush)
      if (!saveFirst.ok) {
        setSaveError(saveFirst.error)
        onAppendAgentLine('error', saveFirst.error)
        setApproving(false)
        return
      }
      onPersistedFragmentsChange(flush)
      const res = await window.api.fragmentsApprove(sessionId)
      if (res.ok) {
        setMeta(res.data.meta)
        setFrames(attachClientIds(res.data.frames))
        setDirtyIds(new Set())
        onPersistedFragmentsChange(res.data)
        onAppendAgentLine('model', 'Script breakdown approved. The Clips tab is unlocked.')
      } else {
        setSaveError(res.error)
        onAppendAgentLine('error', res.error)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSaveError(msg)
      onAppendAgentLine('error', msg)
    } finally {
      setApproving(false)
    }
  }, [sessionId, onAppendAgentLine, onPersistedFragmentsChange])

  const updateFrame = useCallback(
    (clientId: string, patch: Partial<FragmentFrame>) => {
      markDirty(clientId)
      setFrames((prev) => prev.map((f) => (f.clientId === clientId ? { ...f, ...patch } : f)))
    },
    [markDirty]
  )

  const totalSeconds = frames.reduce((s, f) => s + f.duration_seconds, 0)
  const estMinutes = Math.max(1, Math.round(totalSeconds / 60))

  const charList = charactersDocument?.characters ?? []
  const generateDisabled =
    !charactersSheetLocked || generating || fragmentsLocked || !story.trim()

  return (
    <div
      className={`script-breakdown${!charactersSheetLocked ? ' script-breakdown--locked' : ''}${pulse ? ' script-breakdown--pulse-once' : ''}`}
      onAnimationEnd={() => setPulse(false)}
    >
      <p className="editor-section-label">Script breakdown</p>
      <p className="script-breakdown__intro">
        Generate cinematic frames from your story, world settings, and approved characters. Edit each frame, reorder with
        the handle, then approve to unlock clips.
      </p>

      {charactersSheetLocked && genError && (
        <div className="characters-panel__error script-breakdown__error" role="alert">
          <strong>Could not parse or generate script breakdown.</strong>
          <div>{genError}</div>
          <div className="characters-panel__error-actions">
            <button type="button" className="characters-panel__retry" onClick={() => void runGenerate()}>
              Retry
            </button>
          </div>
        </div>
      )}

      {charactersSheetLocked && saveError && (
        <div className="characters-panel__error script-breakdown__error" role="alert">
          <div>{saveError}</div>
        </div>
      )}

      <div className="script-breakdown__toolbar">
        <button
          type="button"
          className="btn-generate btn-generate--story"
          disabled={generateDisabled}
          onClick={() => void runGenerate()}
        >
          {generating ? 'Generating…' : 'Generate Script Breakdown'}
        </button>
      </div>

      {generating && frames.length === 0 && (
        <p className="characters-panel__generating script-breakdown__generating">Generating script breakdown…</p>
      )}

      {charactersSheetLocked && frames.length > 0 && meta && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="script-breakdown__list">
              {frames.map((frame) => (
                <SortableFragmentCard
                  key={frame.clientId}
                  frame={frame}
                  characters={charList}
                  fragmentsLocked={fragmentsLocked}
                  dirty={dirtyIds.has(frame.clientId)}
                  savedFlash={savedFlashId === frame.clientId}
                  onUpdate={updateFrame}
                  onSave={() => void saveFrameCard(frame.clientId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {charactersSheetLocked && frames.length > 0 && (
        <div className="script-breakdown__summary">
          TOTAL FRAMES: {frames.length} &nbsp;·&nbsp; DURATION: {totalSeconds}s &nbsp;·&nbsp; ~{estMinutes} min
        </div>
      )}

      {charactersSheetLocked && frames.length > 0 && !fragmentsLocked && (
        <div className="characters-panel__approve-wrap">
          <button
            type="button"
            className="btn-generate btn-generate--block"
            disabled={approving}
            onClick={() => void runApprove()}
          >
            {approving ? 'Saving…' : 'Approve & Proceed to Video Generation'}
          </button>
        </div>
      )}

      {charactersSheetLocked && fragmentsLocked && frames.length > 0 && (
        <div className="characters-panel__approve-wrap">
          <div className="characters-panel__locked-card">
            <p className="characters-panel__locked-headline">
              <span className="characters-panel__locked-check" aria-hidden="true">
                ✓
              </span>{' '}
              Script breakdown approved
            </p>
            <p className="characters-panel__locked-question">Clips and the next pipeline steps are unlocked.</p>
          </div>
        </div>
      )}
    </div>
  )
}

type CardProps = {
  frame: LocalFragmentFrame
  characters: { id: string; name: string }[]
  fragmentsLocked: boolean
  dirty: boolean
  savedFlash: boolean
  onUpdate: (clientId: string, patch: Partial<FragmentFrame>) => void
  onSave: () => void
}

function SortableFragmentCard({
  frame,
  characters,
  fragmentsLocked,
  dirty,
  savedFlash,
  onUpdate,
  onSave
}: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.clientId,
    disabled: fragmentsLocked
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1
  }

  const toggleCharacter = (id: string, checked: boolean) => {
    const set = new Set(frame.characters_present)
    if (checked) set.add(id)
    else set.delete(id)
    onUpdate(frame.clientId, { characters_present: [...set] })
  }

  const setDialogueLine = (index: number, next: FragmentDialogueLine) => {
    const lines = [...frame.who_says_what]
    lines[index] = next
    onUpdate(frame.clientId, { who_says_what: lines })
  }

  const addDialogue = () => {
    onUpdate(frame.clientId, {
      who_says_what: [...frame.who_says_what, { character_id: '', line: '' }]
    })
  }

  const removeDialogue = (index: number) => {
    onUpdate(frame.clientId, {
      who_says_what: frame.who_says_what.filter((_, i) => i !== index)
    })
  }

  const badgeClass = badgeClassForStatus(frame.status)

  return (
    <article ref={setNodeRef} style={style} className="fragment-card" aria-label={`Frame ${frame.frame_id}`}>
      <button
        type="button"
        className="fragment-card__handle fragment-card__handle--btn"
        disabled={fragmentsLocked}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="fragment-card__body">
        <div className="fragment-card__header">
          <span className="fragment-card__frame-title">Frame {frame.frame_id}</span>
          <div className="fragment-card__header-actions">
            {dirty && !fragmentsLocked && (
              <button type="button" className="character-card__save" onClick={onSave}>
                Save
              </button>
            )}
            {savedFlash && <span className="fragment-card__saved">Saved</span>}
            <span className={`fragment-card__badge fragment-card__badge--${badgeClass}`}>{badgeLabelForStatus(frame.status)}</span>
          </div>
        </div>

        <div className="fragment-card__form">
          <div className="fragment-field fragment-field--full">
            <label className="fragment-field__label" htmlFor={`${frame.clientId}-story`}>
              story_chunk
            </label>
            <textarea
              id={`${frame.clientId}-story`}
              className="char-textarea fragment-textarea"
              rows={3}
              disabled={fragmentsLocked}
              value={frame.story_chunk}
              onChange={(e) => onUpdate(frame.clientId, { story_chunk: e.target.value })}
            />
          </div>
          <div className="fragment-field fragment-field--full">
            <label className="fragment-field__label" htmlFor={`${frame.clientId}-scene`}>
              scene_description
            </label>
            <textarea
              id={`${frame.clientId}-scene`}
              className="char-textarea fragment-textarea"
              rows={3}
              disabled={fragmentsLocked}
              value={frame.scene_description}
              onChange={(e) => onUpdate(frame.clientId, { scene_description: e.target.value })}
            />
          </div>

          <div className="fragment-field fragment-field--full">
            <span className="fragment-field__label">characters_present</span>
            <div className="fragment-char-checkboxes">
              {characters.length === 0 ? (
                <span className="fragment-field__hint">No characters loaded.</span>
              ) : (
                characters.map((c) => (
                  <label key={c.id} className="fragment-char-checkbox">
                    <input
                      type="checkbox"
                      disabled={fragmentsLocked}
                      checked={frame.characters_present.includes(c.id)}
                      onChange={(e) => toggleCharacter(c.id, e.target.checked)}
                    />
                    <span>{c.name || c.id}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="fragment-card__row3">
            <div className="fragment-field">
              <label className="fragment-field__label" htmlFor={`${frame.clientId}-cam`}>
                camera_hint
              </label>
              <select
                id={`${frame.clientId}-cam`}
                className="fragment-field__select"
                disabled={fragmentsLocked}
                value={frame.camera_hint}
                onChange={(e) => onUpdate(frame.clientId, { camera_hint: e.target.value })}
              >
                {CAMERA_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="fragment-field">
              <label className="fragment-field__label" htmlFor={`${frame.clientId}-dur`}>
                duration_seconds
              </label>
              <select
                id={`${frame.clientId}-dur`}
                className="fragment-field__select"
                disabled={fragmentsLocked}
                value={frame.duration_seconds}
                onChange={(e) =>
                  onUpdate(frame.clientId, {
                    duration_seconds: Number(e.target.value) as 4 | 6 | 8
                  })
                }
              >
                {DURATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}s
                  </option>
                ))}
              </select>
            </div>
            <div className="fragment-field">
              <label className="fragment-field__label" htmlFor={`${frame.clientId}-tr`}>
                transition
              </label>
              <select
                id={`${frame.clientId}-tr`}
                className="fragment-field__select"
                disabled={fragmentsLocked}
                value={frame.transition}
                onChange={(e) => onUpdate(frame.clientId, { transition: e.target.value })}
              >
                {TRANSITION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fragment-field fragment-field--full">
            <span className="fragment-field__label">who_says_what</span>
            {frame.who_says_what.length === 0 ? (
              <p className="fragment-dialogue-placeholder">No dialogue in this frame</p>
            ) : (
              <ul className="fragment-dialogue-list">
                {frame.who_says_what.map((row, i) => (
                  <li key={i} className="fragment-dialogue-row">
                    <select
                      className="fragment-field__select fragment-dialogue-row__char"
                      disabled={fragmentsLocked}
                      value={row.character_id}
                      onChange={(e) => setDialogueLine(i, { ...row, character_id: e.target.value })}
                    >
                      <option value="">—</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.id}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="fragment-dialogue-row__line"
                      disabled={fragmentsLocked}
                      value={row.line}
                      placeholder="Line"
                      onChange={(e) => setDialogueLine(i, { ...row, line: e.target.value })}
                    />
                    {!fragmentsLocked && (
                      <button
                        type="button"
                        className="fragment-dialogue-row__remove"
                        aria-label="Remove line"
                        onClick={() => removeDialogue(i)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!fragmentsLocked && (
              <button type="button" className="fragment-add-line" onClick={addDialogue}>
                ＋ Add line
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
