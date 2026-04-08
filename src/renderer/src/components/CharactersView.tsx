import { useCallback, useEffect, useState } from 'react'
import {
  createEmptyCharacterEntry,
  createEmptyCharactersDocument,
  type CharacterEntry,
  type CharactersDocument
} from '@shared/characters-types'
import { buildCharacterPortraitPrompt } from '../../../lib/prompts/character-portrait'
import { ConfirmDialog } from './ConfirmDialog'
import './CharactersView.css'

type Props = {
  sessionId: string
  document: CharactersDocument | null
  isGenerating: boolean
  generateError: string | null
  onRetryGenerate: () => void
  onDocumentChange: (doc: CharactersDocument) => void
  onApproved: (doc: CharactersDocument) => void
  onUnlock: () => void
  onAppendAgentLine: (kind: 'user' | 'model' | 'error', text: string) => void
}

function updateCharacter(
  doc: CharactersDocument,
  index: number,
  next: CharacterEntry
): CharactersDocument {
  const characters = [...doc.characters]
  characters[index] = next
  return { ...doc, characters }
}

function updateMeta(doc: CharactersDocument, meta: Partial<CharactersDocument['meta']>): CharactersDocument {
  return { ...doc, meta: { ...doc.meta, ...meta } }
}

function addCharacterToDocument(doc: CharactersDocument): CharactersDocument {
  return { ...doc, characters: [...doc.characters, createEmptyCharacterEntry()] }
}

function removeCharacterAt(doc: CharactersDocument, index: number): CharactersDocument {
  const characters = doc.characters.filter((_, i) => i !== index)
  return { ...doc, characters }
}

function remapDirtyAfterRemove(dirty: Set<number>, removedIndex: number): Set<number> {
  const next = new Set<number>()
  for (const d of dirty) {
    if (d < removedIndex) next.add(d)
    else if (d > removedIndex) next.add(d - 1)
  }
  return next
}

export function CharactersView({
  sessionId,
  document,
  isGenerating,
  generateError,
  onRetryGenerate,
  onDocumentChange,
  onApproved,
  onUnlock,
  onAppendAgentLine
}: Props) {
  const [dirtyIndices, setDirtyIndices] = useState<Set<number>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null)

  useEffect(() => {
    setDirtyIndices(new Set())
    setSaveError(null)
  }, [document?.meta?.generated_at])

  const markDirty = useCallback((index: number) => {
    setDirtyIndices((prev) => new Set(prev).add(index))
  }, [])

  const saveCharacterBox = useCallback(
    async (characterIndex: number) => {
      if (!document) return
      setSaveError(null)
      const res = await window.api.charactersSave(sessionId, document)
      if (res.ok) {
        setDirtyIndices((prev) => {
          const n = new Set(prev)
          n.delete(characterIndex)
          return n
        })
      } else {
        setSaveError(res.error)
      }
    },
    [document, sessionId]
  )

  const saveEntireDocument = useCallback(async () => {
    if (!document) return
    setSaveError(null)
    const res = await window.api.charactersSave(sessionId, document)
    if (res.ok) {
      setDirtyIndices(new Set())
    } else {
      setSaveError(res.error)
    }
  }, [document, sessionId])

  const handleApprove = useCallback(async () => {
    if (!document) return
    setApproving(true)
    setSaveError(null)
    const res = await window.api.charactersApprove(sessionId, document)
    setApproving(false)
    if (res.ok) {
      onApproved(res.data)
      setDirtyIndices(new Set())
    } else {
      setSaveError(res.error)
    }
  }, [sessionId, onApproved])

  const openUnlockDialog = useCallback(() => {
    setUnlockDialogOpen(true)
  }, [])

  const confirmUnlock = useCallback(() => {
    setUnlockDialogOpen(false)
    setSaveError(null)
    onUnlock()
  }, [onUnlock])

  if (isGenerating && !document) {
    return (
      <div className="characters-panel">
        <p className="characters-panel__generating">Generating characters from your story…</p>
      </div>
    )
  }

  if (generateError && !document) {
    return (
      <div className="characters-panel">
        <div className="characters-panel__error" role="alert">
          <strong>Could not parse or generate characters.</strong>
          <div>{generateError}</div>
          <div className="characters-panel__error-actions">
            <button type="button" className="characters-panel__retry" onClick={onRetryGenerate}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="characters-panel">
        {generateError && (
          <div className="characters-panel__error" role="alert">
            <div>{generateError}</div>
            <div className="characters-panel__error-actions">
              <button type="button" className="characters-panel__retry" onClick={onRetryGenerate}>
                Retry
              </button>
            </div>
          </div>
        )}
        <p className="characters-panel__empty">
          No character sheet yet. Add a character manually, or on the <strong>Story</strong> view use{' '}
          <strong>Generate Characters</strong>.
        </p>
        <div className="characters-panel__manual-actions">
          <button
            type="button"
            className="characters-panel__add-character"
            onClick={() => onDocumentChange(createEmptyCharactersDocument())}
          >
            Add character
          </button>
        </div>
      </div>
    )
  }

  const locked = document.meta.locked
  const canApprove = !locked && document.characters.length > 0

  return (
    <div className="characters-panel">
      {generateError && document && (
        <div className="characters-panel__error" role="alert">
          <div>{generateError}</div>
          <div className="characters-panel__error-actions">
            <button type="button" className="characters-panel__retry" onClick={onRetryGenerate}>
              Retry
            </button>
          </div>
        </div>
      )}
      {saveError && (
        <div className="characters-panel__error" role="alert">
          {saveError}
        </div>
      )}

      <article className="character-card" aria-label="Project meta">
        <div className="character-card__header">
          <h3 className="char-section-title">Meta</h3>
          {!locked && (
            <button type="button" className="character-card__save" onClick={() => void saveEntireDocument()}>
              Save
            </button>
          )}
        </div>
        <div className="char-field char-field--inline">
          <label className="char-label" htmlFor="meta-generated">
            generated_at
          </label>
          <input
            id="meta-generated"
            className="char-input"
            value={document.meta.generated_at}
            disabled
            readOnly
          />
        </div>
        <div className="char-field char-field--inline">
          <label className="char-label" htmlFor="meta-style">
            story_style
          </label>
          <input
            id="meta-style"
            className="char-input"
            value={document.meta.story_style}
            disabled={locked}
            onChange={(e) => onDocumentChange(updateMeta(document, { story_style: e.target.value }))}
          />
        </div>
        <div className="char-field char-field--inline">
          <label className="char-label" htmlFor="meta-lang">
            story_language
          </label>
          <input
            id="meta-lang"
            className="char-input"
            value={document.meta.story_language}
            disabled={locked}
            onChange={(e) => onDocumentChange(updateMeta(document, { story_language: e.target.value }))}
          />
        </div>
        <div className="char-field char-field--inline">
          <span className="char-label">approved / locked</span>
          <input
            className="char-input"
            value={`${document.meta.approved} / ${document.meta.locked}`}
            disabled
            readOnly
          />
        </div>
      </article>

      {document.characters.length === 0 && (
        <p className="characters-panel__empty characters-panel__empty--inline">
          No characters in the list. Use <strong>Add More Character</strong> at the bottom.
        </p>
      )}

      {document.characters.map((char, index) => (
        <CharacterCard
          key={`${char.id}-${index}`}
          char={char}
          index={index}
          locked={locked}
          dirty={dirtyIndices.has(index)}
          storyStyle={document.meta.story_style}
          storyLanguage={document.meta.story_language}
          onAppendAgentLine={onAppendAgentLine}
          onChange={(next) => {
            onDocumentChange(updateCharacter(document, index, next))
            markDirty(index)
          }}
          onSave={() => void saveCharacterBox(index)}
          onRemove={() => {
            if (locked) return
            setRemoveConfirmIndex(index)
          }}
        />
      ))}

      {!locked && (
        <div className="characters-panel__manual-actions characters-panel__manual-actions--end">
          <button
            type="button"
            className="characters-panel__add-character"
            onClick={() => {
              onDocumentChange(addCharacterToDocument(document))
              setDirtyIndices((prev) => new Set(prev).add(document.characters.length))
            }}
          >
            Add More Character
          </button>
        </div>
      )}

      <div className="characters-panel__approve-wrap">
        {locked ? (
          <div className="characters-panel__locked-card">
            <p className="characters-panel__locked-headline">
              <span className="characters-panel__locked-check" aria-hidden="true">
                ✓
              </span>{' '}
              Characters approved and locked.
            </p>
            <p className="characters-panel__locked-question">Need to make changes?</p>
            <button
              type="button"
              className="characters-panel__unlock-btn"
              disabled={isGenerating}
              onClick={() => openUnlockDialog()}
            >
              {isGenerating ? 'Working…' : 'Unlock'}
            </button>
            <p className="characters-panel__unlock-warning" role="note">
              Unlocking lets you edit your saved character sheet again. Any saved script breakdown for this
              project will be cleared. You will need to approve your characters again before continuing.
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="btn-generate btn-generate--block"
            disabled={!canApprove || approving}
            onClick={() => void handleApprove()}
          >
            {approving ? 'Working…' : 'Approve and continue'}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={unlockDialogOpen}
        title="Unlock for editing?"
        message="Your character sheet will stay as it is; you can edit it after unlocking. Saved script breakdown data will be cleared. You will need to approve your characters again before continuing."
        confirmLabel="Unlock"
        cancelLabel="Cancel"
        onConfirm={confirmUnlock}
        onCancel={() => setUnlockDialogOpen(false)}
      />
      <ConfirmDialog
        open={removeConfirmIndex !== null}
        title="Remove character?"
        message="Remove this character from the project?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmDanger
        onConfirm={() => {
          if (removeConfirmIndex === null || !document) return
          const idx = removeConfirmIndex
          onDocumentChange(removeCharacterAt(document, idx))
          setDirtyIndices((prev) => remapDirtyAfterRemove(prev, idx))
          setRemoveConfirmIndex(null)
        }}
        onCancel={() => setRemoveConfirmIndex(null)}
      />
    </div>
  )
}

type CardProps = {
  char: CharacterEntry
  index: number
  locked: boolean
  dirty: boolean
  storyStyle: string
  storyLanguage: string
  onAppendAgentLine: (kind: 'user' | 'model' | 'error', text: string) => void
  onChange: (c: CharacterEntry) => void
  onSave: () => void
  onRemove: () => void
}

function CharacterCard({
  char,
  index,
  locked,
  dirty,
  storyStyle,
  storyLanguage,
  onAppendAgentLine,
  onChange,
  onSave,
  onRemove
}: CardProps) {
  const dis = locked

  const patchIdentity = (k: keyof CharacterEntry['identity'], v: string) =>
    onChange({ ...char, identity: { ...char.identity, [k]: v } })
  const patchAppearance = (k: keyof CharacterEntry['appearance'], v: string) =>
    onChange({ ...char, appearance: { ...char.appearance, [k]: v } })
  const patchOutfit = (k: keyof Omit<CharacterEntry['outfit'], 'never_changes'>, v: string) =>
    onChange({ ...char, outfit: { ...char.outfit, [k]: v } })
  const patchPalette = (k: keyof CharacterEntry['color_palette'], v: string) =>
    onChange({ ...char, color_palette: { ...char.color_palette, [k]: v } })
  const patchRendering = (k: keyof CharacterEntry['rendering'], v: string) =>
    onChange({ ...char, rendering: { ...char.rendering, [k]: v } })
  const patchVoice = (k: keyof CharacterEntry['voice'], v: string) =>
    onChange({ ...char, voice: { ...char.voice, [k]: v } })

  const setNever = (i: number, v: string) => {
    const never_changes = [...char.outfit.never_changes]
    never_changes[i] = v
    onChange({ ...char, outfit: { ...char.outfit, never_changes } })
  }
  const addNever = () => {
    if (char.outfit.never_changes.length >= 4) return
    onChange({
      ...char,
      outfit: { ...char.outfit, never_changes: [...char.outfit.never_changes, ''] }
    })
  }
  const removeNever = (i: number) => {
    if (char.outfit.never_changes.length <= 2) return
    const never_changes = char.outfit.never_changes.filter((_, j) => j !== i)
    onChange({ ...char, outfit: { ...char.outfit, never_changes } })
  }

  const idBase = `ch-${char.id}-${index}`

  const [portrait, setPortrait] = useState<{
    loading: boolean
    error: string | null
    dataUrl: string | null
  }>({ loading: false, error: null, dataUrl: null })

  const handleSeeLooks = useCallback(async () => {
    const label = char.name.trim() || char.id || `Character ${index + 1}`
    onAppendAgentLine('user', `See how ${label} looks.`)
    onAppendAgentLine(
      'model',
      `I'm generating a preview image for "${label}" from this character sheet (your Image Model in Settings). One moment…`
    )
    setPortrait((prev) => ({ loading: true, error: null, dataUrl: prev.dataUrl }))
    const prompt = buildCharacterPortraitPrompt(char, storyStyle, storyLanguage)
    const res = await window.api.geminiCharacterPortrait({ prompt })
    if (!res.ok) {
      onAppendAgentLine('error', res.error)
      setPortrait((prev) => ({ loading: false, error: res.error, dataUrl: prev.dataUrl }))
      return
    }
    const dataUrl = `data:${res.mimeType};base64,${res.dataBase64}`
    onAppendAgentLine(
      'model',
      `Here's a preview image for "${label}". You can generate again anytime if you edit the sheet.`
    )
    setPortrait({ loading: false, error: null, dataUrl })
  }, [char, index, onAppendAgentLine, storyLanguage, storyStyle])

  return (
    <article className="character-card" aria-label={`Character ${char.name || char.id}`}>
      <div className="character-card__header">
        <h3 className="character-card__title">{char.name || char.id || `Character ${index + 1}`}</h3>
        <div className="character-card__header-actions">
          {!dis && (
            <button type="button" className="character-card__remove" onClick={onRemove}>
              Remove character
            </button>
          )}
          {dirty && !dis && (
            <button type="button" className="character-card__save" onClick={onSave}>
              Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="char-field char-field--inline">
        <label className="char-label" htmlFor={`${idBase}-id`}>
          id
        </label>
        <input
          id={`${idBase}-id`}
          className="char-input"
          value={char.id}
          disabled={dis}
          onChange={(e) => onChange({ ...char, id: e.target.value })}
        />
      </div>
      <div className="char-field char-field--inline">
        <label className="char-label" htmlFor={`${idBase}-name`}>
          name
        </label>
        <input
          id={`${idBase}-name`}
          className="char-input"
          value={char.name}
          disabled={dis}
          onChange={(e) => onChange({ ...char, name: e.target.value })}
        />
      </div>

      <hr className="char-divider" />
      <h4 className="char-section-title">Identity</h4>
      {(['role', 'species_or_type', 'gender', 'age_description', 'personality'] as const).map((k) => (
        <div key={k} className="char-field char-field--inline">
          <label className="char-label" htmlFor={`${idBase}-id-${k}`}>
            {k}
          </label>
          <input
            id={`${idBase}-id-${k}`}
            className="char-input"
            value={char.identity[k]}
            disabled={dis}
            onChange={(e) => patchIdentity(k, e.target.value)}
          />
        </div>
      ))}

      <hr className="char-divider" />
      <h4 className="char-section-title">Appearance</h4>
      {(['body', 'skin_fur_or_texture', 'face', 'hair', 'distinctive_features'] as const).map((k) => (
        <div key={k} className="char-field char-field--inline char-field--multiline">
          <label className="char-label" htmlFor={`${idBase}-ap-${k}`}>
            {k}
          </label>
          <textarea
            id={`${idBase}-ap-${k}`}
            className="char-textarea"
            rows={2}
            value={char.appearance[k]}
            disabled={dis}
            onChange={(e) => patchAppearance(k, e.target.value)}
          />
        </div>
      ))}

      <hr className="char-divider" />
      <h4 className="char-section-title">Outfit</h4>
      {(['primary', 'bottoms', 'footwear', 'accessories'] as const).map((k) => (
        <div key={k} className="char-field char-field--inline">
          <label className="char-label" htmlFor={`${idBase}-out-${k}`}>
            {k}
          </label>
          <input
            id={`${idBase}-out-${k}`}
            className="char-input"
            value={char.outfit[k]}
            disabled={dis}
            onChange={(e) => patchOutfit(k, e.target.value)}
          />
        </div>
      ))}
      <div className="char-field char-field--never-block">
        <span className="char-label">never_changes</span>
        <div className="char-never-wrap">
          <ul className="char-never-list">
            {char.outfit.never_changes.map((line, i) => (
              <li key={i} className="char-never-row">
                <input
                  className="char-input"
                  value={line}
                  disabled={dis}
                  onChange={(e) => setNever(i, e.target.value)}
                />
                {!dis && char.outfit.never_changes.length > 2 && (
                  <button type="button" className="char-never-remove" onClick={() => removeNever(i)}>
                    −
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!dis && char.outfit.never_changes.length < 4 && (
            <button type="button" className="char-never-add" onClick={addNever}>
              + Add line
            </button>
          )}
        </div>
      </div>

      <hr className="char-divider" />
      <h4 className="char-section-title">Color palette</h4>
      {(['skin_or_base', 'outfit_primary', 'outfit_secondary', 'accent'] as const).map((k) => (
        <div key={k} className="char-field char-field--inline">
          <label className="char-label" htmlFor={`${idBase}-cp-${k}`}>
            {k}
          </label>
          <input
            id={`${idBase}-cp-${k}`}
            className="char-input"
            value={char.color_palette[k]}
            disabled={dis}
            onChange={(e) => patchPalette(k, e.target.value)}
          />
        </div>
      ))}

      <hr className="char-divider" />
      <h4 className="char-section-title">Rendering</h4>
      {(['style', 'line_weight', 'texture', 'face_expressiveness', 'consistency_anchor'] as const).map((k) => (
        <div key={k} className="char-field char-field--inline char-field--multiline">
          <label className="char-label" htmlFor={`${idBase}-ren-${k}`}>
            {k}
          </label>
          <textarea
            id={`${idBase}-ren-${k}`}
            className="char-textarea"
            rows={k === 'consistency_anchor' ? 3 : 2}
            value={char.rendering[k]}
            disabled={dis}
            onChange={(e) => patchRendering(k, e.target.value)}
          />
        </div>
      ))}

      <hr className="char-divider" />
      <h4 className="char-section-title">Voice</h4>
      {(['tone', 'accent', 'speech_pattern'] as const).map((k) => (
        <div key={k} className="char-field char-field--inline">
          <label className="char-label" htmlFor={`${idBase}-v-${k}`}>
            {k}
          </label>
          <input
            id={`${idBase}-v-${k}`}
            className="char-input"
            value={char.voice[k]}
            disabled={dis}
            onChange={(e) => patchVoice(k, e.target.value)}
          />
        </div>
      ))}

      <hr className="char-divider" />
      <div className="char-field char-field--inline char-field--multiline">
        <label className="char-label" htmlFor={`${idBase}-pf`}>
          prompt_fragment
        </label>
        <textarea
          id={`${idBase}-pf`}
          className="char-textarea"
          rows={4}
          value={char.prompt_fragment}
          disabled={dis}
          onChange={(e) => onChange({ ...char, prompt_fragment: e.target.value })}
        />
      </div>

      <hr className="char-divider" />
      <div className="char-portrait-block">
        <button
          type="button"
          className="char-portrait-btn"
          disabled={portrait.loading}
          onClick={() => void handleSeeLooks()}
        >
          {portrait.loading ? 'Generating preview…' : 'See how this character looks'}
        </button>
        {portrait.error && (
          <p className="char-portrait-error" role="alert">
            {portrait.error}
          </p>
        )}
        {portrait.dataUrl && !portrait.loading && (
          <figure className="char-portrait-figure">
            <img
              className="char-portrait-img"
              src={portrait.dataUrl}
              alt={`Generated preview of ${char.name || char.id || 'character'}`}
            />
            <figcaption className="char-portrait-caption">Gemini preview (may include SynthID watermark)</figcaption>
          </figure>
        )}
      </div>
    </article>
  )
}
