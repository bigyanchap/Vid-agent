import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setSaved(false)
    void window.api.getGeminiApiKey().then(setKey)
  }, [open])

  if (!open) return null

  async function handleSave(): Promise<void> {
    await window.api.setGeminiApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="settings-title" className="modal__title">
            Settings
          </h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal__body">
          <label className="modal-field__label" htmlFor="gemini-key">
            Gemini API key
          </label>
          <input
            id="gemini-key"
            className="modal-field__input"
            type="password"
            autoComplete="off"
            placeholder="Paste your Google AI Studio key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <p className="modal-field__hint">
            Stored locally in your app data folder. Used only to call the Gemini API from this app.
          </p>
        </div>
        <div className="modal__footer">
          {saved ? <span className="modal__saved">Saved.</span> : <span className="modal__saved-placeholder" />}
          <div className="modal__actions">
            <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="modal-btn modal-btn--primary" onClick={() => void handleSave()}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
