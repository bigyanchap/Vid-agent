/** Persisted in userData/settings.json (API keys encrypted on disk in main process). */

export type TextProviderId = 'gemini' | 'openai' | 'anthropic' | 'grok' | 'mistral'

export type ImageProviderId = 'gemini' | 'imagen4' | 'imagen3' | 'dalle3' | 'flux' | 'stability'

export type VideoProviderId =
  | 'veo2'
  | 'veo3'
  | 'seedance'
  | 'runwaygen2'
  | 'runwaygen3'
  | 'pika'
  | 'kling'
  | 'stability'

export type TextModelSettings = {
  provider: TextProviderId
  model: string
  api_key: string
}

export type ImageModelSettings = {
  provider: ImageProviderId
  model: string
  api_key: string
}

export type VideoModelSettings = {
  provider: VideoProviderId
  model: string
  api_key: string
}

export type AppSettings = {
  text_model: TextModelSettings
  image_model: ImageModelSettings
  video_model: VideoModelSettings
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  text_model: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    api_key: ''
  },
  image_model: {
    provider: 'imagen4',
    model: 'imagen-4.0-generate-001',
    api_key: ''
  },
  video_model: {
    provider: 'veo2',
    model: 'veo-2.0-flash-exp',
    api_key: ''
  }
}

/** Human-facing provider names: company + product (Settings, status bar, logs). */
export const TEXT_PROVIDER_LABEL: Record<TextProviderId, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  grok: 'xAI Grok',
  mistral: 'Mistral AI'
}

export const VIDEO_PROVIDER_LABEL: Record<VideoProviderId, string> = {
  veo2: 'Google Veo 2',
  veo3: 'Google Veo 3',
  seedance: 'ByteDance Seedance',
  runwaygen2: 'Runway Gen-2',
  runwaygen3: 'Runway Gen-3',
  pika: 'Pika Labs (fal.ai)',
  kling: 'Kling (fal.ai)',
  stability: 'Stability AI'
}

/** Approximate pricing note for the Settings video provider dropdown only. */
export const VIDEO_PROVIDER_PRICE_HINT: Record<VideoProviderId, string> = {
  veo2: '~$21/min',
  veo3: '~$30/min',
  seedance: '~$1.20/min',
  runwaygen2: '~$3/min',
  runwaygen3: '~$4.80/min',
  pika: '~$4.80/min',
  kling: '~$2.40/min',
  stability: '~$1.80/min'
}

export const TEXT_MODEL_PLACEHOLDER: Record<TextProviderId, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-5',
  grok: 'grok-3',
  mistral: 'mistral-large-latest'
}

export const IMAGE_MODEL_PLACEHOLDER: Record<ImageProviderId, string> = {
  gemini: 'gemini-3.1-flash-image-preview',
  imagen4: 'imagen-4.0-generate-001',
  imagen3: 'imagen-3.0-generate-002',
  dalle3: 'dall-e-3',
  flux: 'fal-ai/flux-pro/v1.1',
  stability: 'stable-diffusion-3'
}

export const IMAGE_PROVIDER_LABEL: Record<ImageProviderId, string> = {
  gemini: 'Google Gemini (image)',
  imagen4: 'Google Imagen 4',
  imagen3: 'Google Imagen 3',
  dalle3: 'OpenAI DALL·E 3',
  flux: 'Black Forest Labs Flux (fal.ai)',
  stability: 'Stability AI'
}

export type ModelOption = { value: string; label: string }

/** Settings `<select>` order; labels use *PROVIDER_LABEL (+ price hint for video). */
export const TEXT_PROVIDERS_ORDER: TextProviderId[] = [
  'gemini',
  'openai',
  'anthropic',
  'grok',
  'mistral'
]

export const IMAGE_PROVIDERS_ORDER: ImageProviderId[] = [
  'gemini',
  'imagen4',
  'imagen3',
  'dalle3',
  'flux',
  'stability'
]

export const VIDEO_PROVIDERS_ORDER: VideoProviderId[] = [
  'veo2',
  'veo3',
  'seedance',
  'runwaygen2',
  'runwaygen3',
  'pika',
  'kling',
  'stability'
]

export const TEXT_MODEL_OPTIONS: Record<TextProviderId, ModelOption[]> = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' }
  ],
  openai: [
    { value: 'gpt-4o', label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    { value: 'gpt-4-turbo', label: 'gpt-4-turbo' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5' },
    { value: 'claude-3-5-sonnet-20241022', label: 'claude-3-5-sonnet-20241022' },
    { value: 'claude-3-opus-20240229', label: 'claude-3-opus-20240229' }
  ],
  grok: [
    { value: 'grok-3', label: 'grok-3' },
    { value: 'grok-2', label: 'grok-2' }
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'mistral-large-latest' },
    { value: 'mistral-small-latest', label: 'mistral-small-latest' }
  ]
}

export const IMAGE_MODEL_OPTIONS: Record<ImageProviderId, ModelOption[]> = {
  gemini: [{ value: 'gemini-3.1-flash-image-preview', label: 'gemini-3.1-flash-image-preview' }],
  imagen4: [
    { value: 'imagen-4.0-generate-001', label: 'imagen-4.0-generate-001' },
    { value: 'imagen-4.0-generate-002', label: 'imagen-4.0-generate-002' }
  ],
  imagen3: [{ value: 'imagen-3.0-generate-002', label: 'imagen-3.0-generate-002' }],
  dalle3: [
    { value: 'dall-e-3', label: 'dall-e-3' },
    { value: 'dall-e-2', label: 'dall-e-2' }
  ],
  flux: [
    { value: 'fal-ai/flux-pro/v1.1', label: 'flux-pro v1.1 (fal)' },
    { value: 'fal-ai/flux/dev', label: 'flux dev (fal)' }
  ],
  stability: [
    { value: 'stable-diffusion-3', label: 'stable-diffusion-3' },
    { value: 'stable-diffusion-xl-1024-v1-0', label: 'stable-diffusion-xl-1024-v1-0' }
  ]
}

export const VIDEO_MODEL_OPTIONS: Record<VideoProviderId, ModelOption[]> = {
  veo2: [
    { value: 'veo-2.0-flash-exp', label: 'veo-2.0-flash-exp' },
    { value: 'veo-2.0-generate-001', label: 'veo-2.0-generate-001' }
  ],
  veo3: [
    { value: 'veo-3.0-generate', label: 'veo-3.0-generate' },
    { value: 'veo-3.0-generate-001', label: 'veo-3.0-generate-001' }
  ],
  seedance: [
    { value: 'seedance-2.0', label: 'seedance-2.0' },
    { value: 'seedance-1.0', label: 'seedance-1.0' }
  ],
  runwaygen2: [{ value: 'gen2', label: 'gen2 (Runway)' }, { value: 'gen4.5', label: 'gen4.5' }],
  runwaygen3: [{ value: 'gen3-turbo', label: 'gen3-turbo' }, { value: 'gen4.5', label: 'gen4.5' }],
  pika: [
    { value: 'pika-2.0', label: 'pika-2.0' },
    { value: 'pika-2.2', label: 'pika-2.2' }
  ],
  kling: [
    { value: 'kling-v1-5', label: 'kling-v1-5' },
    { value: 'kling-v2', label: 'kling-v2' }
  ],
  stability: [
    { value: 'stable-video-diffusion', label: 'stable-video-diffusion' },
    { value: 'svd-xt', label: 'svd-xt' }
  ]
}

function pickValidModel(
  current: string,
  options: ModelOption[],
  fallback: string
): string {
  const ids = options.map((o) => o.value)
  const t = current.trim()
  return t && ids.includes(t) ? t : fallback
}

export const VIDEO_MODEL_PLACEHOLDER: Record<VideoProviderId, string> = {
  veo2: 'veo-2.0-flash-exp',
  veo3: 'veo-3.0-generate',
  seedance: 'seedance-2.0',
  runwaygen2: 'gen2',
  runwaygen3: 'gen3-turbo',
  pika: 'pika-2.0',
  kling: 'kling-v1-5',
  stability: 'stable-video-diffusion'
}

const TEXT_IDS = new Set<string>(['gemini', 'openai', 'anthropic', 'grok', 'mistral'])
const IMAGE_IDS = new Set<string>(['gemini', 'imagen4', 'imagen3', 'dalle3', 'flux', 'stability'])
const VIDEO_IDS = new Set<string>([
  'veo2',
  'veo3',
  'seedance',
  'runwaygen2',
  'runwaygen3',
  'pika',
  'kling',
  'stability'
])

export function normalizeTextProvider(raw: string): TextProviderId | null {
  const p = raw.trim().toLowerCase()
  return TEXT_IDS.has(p) ? (p as TextProviderId) : null
}

export function normalizeImageProvider(raw: string): ImageProviderId | null {
  const p = raw.trim().toLowerCase()
  return IMAGE_IDS.has(p) ? (p as ImageProviderId) : null
}

export function normalizeVideoProvider(raw: string): VideoProviderId | null {
  const p = raw.trim().toLowerCase()
  return VIDEO_IDS.has(p) ? (p as VideoProviderId) : null
}

export function coerceAppSettings(raw: unknown): AppSettings {
  const d = DEFAULT_APP_SETTINGS
  if (!raw || typeof raw !== 'object') return structuredClone(d)
  const o = raw as Record<string, unknown>
  const tm = o.text_model as Record<string, unknown> | undefined
  const im = o.image_model as Record<string, unknown> | undefined
  const vm = o.video_model as Record<string, unknown> | undefined
  const tp = normalizeTextProvider(typeof tm?.provider === 'string' ? tm.provider : '') ?? d.text_model.provider
  const ip = normalizeImageProvider(typeof im?.provider === 'string' ? im.provider : '') ?? d.image_model.provider
  const vp = normalizeVideoProvider(typeof vm?.provider === 'string' ? vm.provider : '') ?? d.video_model.provider
  const textOpts = TEXT_MODEL_OPTIONS[tp]
  const imageOpts = IMAGE_MODEL_OPTIONS[ip]
  const videoOpts = VIDEO_MODEL_OPTIONS[vp]
  const textDefault = textOpts[0]?.value ?? d.text_model.model
  const imageDefault = imageOpts[0]?.value ?? d.image_model.model
  const videoDefault = videoOpts[0]?.value ?? d.video_model.model
  const tmModel = typeof tm?.model === 'string' ? tm.model : d.text_model.model
  const imModel = typeof im?.model === 'string' ? im.model : d.image_model.model
  const vmModel = typeof vm?.model === 'string' ? vm.model : d.video_model.model
  return {
    text_model: {
      provider: tp,
      model: pickValidModel(tmModel, textOpts, textDefault),
      api_key: typeof tm?.api_key === 'string' ? tm.api_key : ''
    },
    image_model: {
      provider: ip,
      model: pickValidModel(imModel, imageOpts, imageDefault),
      api_key: typeof im?.api_key === 'string' ? im.api_key : ''
    },
    video_model: {
      provider: vp,
      model: pickValidModel(vmModel, videoOpts, videoDefault),
      api_key: typeof vm?.api_key === 'string' ? vm.api_key : ''
    }
  }
}
