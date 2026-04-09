import { useCallback, useEffect, useState } from 'react'
import type {
  AppSettings,
  ImageProviderId,
  TextProviderId,
  VideoProviderId
} from '@shared/app-settings'
import {
  DEFAULT_APP_SETTINGS,
  IMAGE_MODEL_OPTIONS,
  IMAGE_PROVIDERS_ORDER,
  IMAGE_PROVIDER_LABEL,
  TEXT_MODEL_OPTIONS,
  TEXT_PROVIDERS_ORDER,
  TEXT_PROVIDER_LABEL,
  VIDEO_MODEL_OPTIONS,
  VIDEO_PROVIDERS_ORDER,
  VIDEO_PROVIDER_LABEL,
  VIDEO_PROVIDER_PRICE_HINT
} from '@shared/app-settings'

const TEXT_OPTIONS = TEXT_PROVIDERS_ORDER.map((value) => ({
  value,
  label: TEXT_PROVIDER_LABEL[value]
}))

const IMAGE_OPTIONS = IMAGE_PROVIDERS_ORDER.map((value) => ({
  value,
  label: IMAGE_PROVIDER_LABEL[value]
}))

const VIDEO_OPTIONS = VIDEO_PROVIDERS_ORDER.map((value) => ({
  value,
  label: `${VIDEO_PROVIDER_LABEL[value]} (${VIDEO_PROVIDER_PRICE_HINT[value]})`
}))

type Props = {
  onSaved?: () => void
  onClose: () => void
}

export function SettingsView({ onSaved, onClose }: Props) {
  const [data, setData] = useState<AppSettings>(() => structuredClone(DEFAULT_APP_SETTINGS))
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.api
      .settingsLoad()
      .then((s) => {
        if (!cancelled) setData(structuredClone(s))
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async () => {
    setLoadError(null)
    try {
      await window.api.settingsSave(data)
      onSaved?.()
      onClose()
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [data, onSaved, onClose])

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
        <div className="settings-page__header-actions">
          <button
            type="button"
            className="settings-page__close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
      </header>
      {loadError && <p className="settings-page__error">{loadError}</p>}

      <section className="settings-section" aria-labelledby="settings-text-heading">
        <h2 id="settings-text-heading" className="settings-section__title">
          Text model
        </h2>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-text-provider">
            Provider
          </label>
          <select
            id="set-text-provider"
            className="settings-field__select"
            value={data.text_model.provider}
            onChange={(e) => {
              const provider = e.target.value as TextProviderId
              const model = TEXT_MODEL_OPTIONS[provider][0].value
              setData((d) => ({
                ...d,
                text_model: { ...d.text_model, provider, model }
              }))
            }}
          >
            {TEXT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-text-model">
            Model name
          </label>
          <select
            id="set-text-model"
            className="settings-field__select"
            value={data.text_model.model}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                text_model: { ...d.text_model, model: e.target.value }
              }))
            }
          >
            {TEXT_MODEL_OPTIONS[data.text_model.provider].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-text-key">
            API key
          </label>
          <input
            id="set-text-key"
            className="settings-field__input"
            type="password"
            autoComplete="off"
            placeholder="••••••••"
            value={data.text_model.api_key}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                text_model: { ...d.text_model, api_key: e.target.value }
              }))
            }
          />
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-image-heading">
        <h2 id="settings-image-heading" className="settings-section__title">
          Image model
        </h2>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-image-provider">
            Provider
          </label>
          <select
            id="set-image-provider"
            className="settings-field__select"
            value={data.image_model.provider}
            onChange={(e) => {
              const provider = e.target.value as ImageProviderId
              const model = IMAGE_MODEL_OPTIONS[provider][0].value
              setData((d) => ({
                ...d,
                image_model: { ...d.image_model, provider, model }
              }))
            }}
          >
            {IMAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-image-model">
            Model name
          </label>
          <select
            id="set-image-model"
            className="settings-field__select"
            value={data.image_model.model}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                image_model: { ...d.image_model, model: e.target.value }
              }))
            }
          >
            {IMAGE_MODEL_OPTIONS[data.image_model.provider].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-image-key">
            API key
          </label>
          <input
            id="set-image-key"
            className="settings-field__input"
            type="password"
            autoComplete="off"
            placeholder="••••••••"
            value={data.image_model.api_key}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                image_model: { ...d.image_model, api_key: e.target.value }
              }))
            }
          />
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-video-heading">
        <h2 id="settings-video-heading" className="settings-section__title">
          Video model
        </h2>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-video-provider">
            Provider
          </label>
          <select
            id="set-video-provider"
            className="settings-field__select"
            value={data.video_model.provider}
            onChange={(e) => {
              const provider = e.target.value as VideoProviderId
              const model = VIDEO_MODEL_OPTIONS[provider][0].value
              setData((d) => ({
                ...d,
                video_model: { ...d.video_model, provider, model }
              }))
            }}
          >
            {VIDEO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <p className="settings-field__hint settings-field__hint--muted">
          Prices added here were last updated at 4/6/2026. Check provider website for latest updated
          rates.
        </p>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-video-model">
            Model name
          </label>
          <select
            id="set-video-model"
            className="settings-field__select"
            value={data.video_model.model}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                video_model: { ...d.video_model, model: e.target.value }
              }))
            }
          >
            {VIDEO_MODEL_OPTIONS[data.video_model.provider].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-field settings-field--row">
          <label className="settings-field__label" htmlFor="set-video-key">
            API key
          </label>
          <input
            id="set-video-key"
            className="settings-field__input"
            type="password"
            autoComplete="off"
            placeholder="••••••••"
            value={data.video_model.api_key}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                video_model: { ...d.video_model, api_key: e.target.value }
              }))
            }
          />
        </div>
      </section>
      <div className="settings-page__save-btn-container">
        <button type="button" className="settings-page__save-btn" onClick={() => void save()}>
              Save settings
        </button>
        <button type="button" className="settings-page__cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
