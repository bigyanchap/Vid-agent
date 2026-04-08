import { fal } from '@fal-ai/client'
import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { writeFile } from 'fs/promises'
import {
  normalizeImageProvider,
  type ImageProviderId
} from '../shared/app-settings'
import {
  generateCharacterPortrait,
  type CharacterPortraitResult
} from './gemini-character-portrait'
import { loadAppSettings, resolveApiKeys } from './settings-store'

function unknownProviderMessage(provider: string): string {
  return `Unknown provider: ${provider}. Please check your Settings.`
}

export async function generateCharacterPortraitRouted(prompt: string): Promise<CharacterPortraitResult> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return { ok: false, error: 'Character description is empty.' }
  }
  const s = loadAppSettings()
  const keys = resolveApiKeys(s)
  const raw = s.image_model.provider
  const provider = normalizeImageProvider(raw)
  if (!provider) {
    return { ok: false, error: unknownProviderMessage(raw) }
  }
  const apiKey = keys.image.trim()
  if (!apiKey) {
    return {
      ok: false,
      error:
        'Image model API key is missing. Go to Settings → Image Model to add it.'
    }
  }
  const model = s.image_model.model.trim()
  return routePortrait(provider, apiKey, model, trimmed)
}

async function routePortrait(
  provider: ImageProviderId,
  apiKey: string,
  model: string,
  prompt: string
): Promise<CharacterPortraitResult> {
  switch (provider) {
    case 'gemini':
      return generateCharacterPortrait(apiKey, prompt, model || undefined)
    case 'imagen3':
      return imagenPortrait(apiKey, model || 'imagen-3.0-generate-002', prompt)
    case 'dalle3':
      return dallePortrait(apiKey, model || 'dall-e-3', prompt)
    case 'flux':
      return fluxPortrait(apiKey, model, prompt)
    case 'stability':
      return stabilityPortrait(apiKey, model || 'stable-diffusion-3', prompt)
    default:
      return { ok: false, error: unknownProviderMessage(provider) }
  }
}

async function imagenPortrait(
  apiKey: string,
  model: string,
  prompt: string
): Promise<CharacterPortraitResult> {
  try {
    const ai = new GoogleGenAI({ apiKey })
    const res = await ai.models.generateImages({
      model,
      prompt,
      config: {
        aspectRatio: '16:9',
        numberOfImages: 1
      }
    })
    const b64 = res.generatedImages?.[0]?.image?.imageBytes
    if (!b64) {
      return { ok: false, error: 'Imagen returned no image bytes.' }
    }
    return { ok: true, mimeType: 'image/png', dataBase64: b64 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function dallePortrait(
  apiKey: string,
  model: string,
  prompt: string
): Promise<CharacterPortraitResult> {
  try {
    const client = new OpenAI({ apiKey })
    const res = await client.images.generate({
      model,
      prompt,
      size: '1024x1024',
      response_format: 'b64_json'
    })
    const b64 = res.data?.[0]?.b64_json
    if (!b64) {
      return { ok: false, error: 'DALL·E returned no image.' }
    }
    return { ok: true, mimeType: 'image/png', dataBase64: b64 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function fluxPortrait(
  apiKey: string,
  model: string,
  prompt: string
): Promise<CharacterPortraitResult> {
  try {
    const endpoint = model?.trim().startsWith('fal-ai/') ? model.trim() : 'fal-ai/flux-pro/v1.1'
    fal.config({ credentials: apiKey })
    const result = await fal.subscribe(endpoint, {
      input: {
        prompt,
        image_size: 'landscape_16_9',
        num_images: 1
      }
    })
    const data = result.data as {
      images?: Array<{ url?: string; file_name?: string; content_type?: string }>
    }
    const url = data.images?.[0]?.url
    if (!url) {
      return { ok: false, error: 'Flux returned no image URL.' }
    }
    const imgRes = await fetch(url)
    if (!imgRes.ok) {
      return { ok: false, error: `Failed to download Flux image (${imgRes.status}).` }
    }
    const buf = Buffer.from(await imgRes.arrayBuffer())
    return { ok: true, mimeType: 'image/png', dataBase64: buf.toString('base64') }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function stabilityPortrait(
  apiKey: string,
  model: string,
  prompt: string
): Promise<CharacterPortraitResult> {
  try {
    const form = new FormData()
    form.append('prompt', prompt)
    form.append('output_format', 'png')
    form.append('model', model)
    const res = await fetch(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'image/*'
        },
        body: form
      }
    )
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: errText.slice(0, 500) || `Stability (${res.status})` }
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return { ok: true, mimeType: res.headers.get('content-type') || 'image/png', dataBase64: buf.toString('base64') }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function generateStillToPath(opts: {
  prompt: string
  pngPath: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await generateCharacterPortraitRouted(opts.prompt)
  if (!r.ok) return r
  try {
    await writeFile(opts.pngPath, Buffer.from(r.dataBase64, 'base64'))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
