import { GoogleGenAI } from '@google/genai'
import { copyFile, readFile, writeFile } from 'fs/promises'
import { buildClipPrompt } from '../lib/prompts/clips'
import type { CharacterEntry } from '../shared/characters-types'
import type { CharacterMeta } from '../shared/characters-types'
import type { FragmentFrame, FragmentsMeta } from '../shared/fragments-types'
import { generateStillToPath } from './provider-image'
import { stillPngToMp4WithCaption } from './ffmpeg-still-to-mp4'

/** Default Veo model when settings do not override (legacy reference). */
export const VEO_MODEL = 'veo-3.0-generate-001'

export const IMAGEN_MODEL = 'imagen-3.0-generate-002'

const POLL_MS = 10_000
const VEO_TIMEOUT_MS = 180_000

function client(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey })
}

function mimeForSeedPath(p: string): string {
  const lower = p.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/png'
}

export async function generateVideoWithVeo(opts: {
  apiKey: string
  /** Gemini Veo model id from Settings (e.g. veo-2.0-flash-exp, veo-3.0-generate). */
  model?: string
  prompt: string
  durationSeconds: 4 | 6 | 8
  downloadPath: string
  /** Optional first-frame image (PNG/JPEG/WebP) for image-to-video. */
  seedImagePath?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, prompt, durationSeconds, downloadPath } = opts
  const modelId = (opts.model?.trim() || VEO_MODEL) as string
  const ai = client(apiKey)
  const resolution = durationSeconds === 8 ? '1080p' : '720p'

  let seedImage:
    | {
        imageBytes: string
        mimeType: string
      }
    | undefined
  if (opts.seedImagePath) {
    try {
      const buf = await readFile(opts.seedImagePath)
      seedImage = {
        imageBytes: buf.toString('base64'),
        mimeType: mimeForSeedPath(opts.seedImagePath)
      }
    } catch (e) {
      return {
        ok: false,
        error: `Could not read seed image: ${e instanceof Error ? e.message : String(e)}`
      }
    }
  }

  let operation
  try {
    operation = await ai.models.generateVideos({
      model: modelId,
      prompt,
      ...(seedImage ? { image: seedImage } : {}),
      config: {
        aspectRatio: '16:9',
        durationSeconds,
        resolution
      }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Veo request failed: ${msg}` }
  }

  const started = Date.now()
  try {
    while (!operation.done) {
      if (Date.now() - started >= VEO_TIMEOUT_MS) {
        return { ok: false, error: 'Veo 3 timed out after 3 minutes.' }
      }
      await new Promise((r) => setTimeout(r, POLL_MS))
      operation = await ai.operations.getVideosOperation({ operation })
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  if (operation.error) {
    const msg =
      typeof operation.error === 'object' && operation.error && 'message' in operation.error
        ? String((operation.error as { message?: string }).message)
        : JSON.stringify(operation.error)
    return { ok: false, error: msg || 'Veo operation error' }
  }

  const video = operation.response?.generatedVideos?.[0]?.video
  if (!video) {
    return { ok: false, error: 'Veo returned no video.' }
  }

  try {
    await ai.files.download({ file: video, downloadPath })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** @deprecated Prefer {@link generateStillToPath} from provider-image (uses Settings). Kept for Gemini/Imagen direct calls. */
export async function generateStillWithImagen(opts: {
  apiKey: string
  prompt: string
  pngPath: string
  model?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, prompt, pngPath } = opts
  const model = opts.model?.trim() || IMAGEN_MODEL
  const ai = client(apiKey)
  try {
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
    await writeFile(pngPath, Buffer.from(b64, 'base64'))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function runFallbackStillToVideo(opts: {
  apiKey: string
  frame: FragmentFrame
  characters: CharacterEntry[]
  charactersMeta: CharacterMeta
  fragmentsMeta: FragmentsMeta
  stillPngPath: string
  outMp4Path: string
  workDir: string
  captionBaseName: string
  /** When set, use this file as the still instead of generating a new image. */
  seedStillAbsPath?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const prompt = buildClipPrompt(
    opts.frame,
    opts.characters,
    opts.charactersMeta,
    opts.fragmentsMeta
  )
  if (opts.seedStillAbsPath) {
    try {
      await copyFile(opts.seedStillAbsPath, opts.stillPngPath)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  } else {
    const img = await generateStillToPath({ prompt, pngPath: opts.stillPngPath })
    if (!img.ok) return img
  }

  try {
    await stillPngToMp4WithCaption({
      stillPngPath: opts.stillPngPath,
      outMp4Path: opts.outMp4Path,
      durationSeconds: opts.frame.duration_seconds,
      sceneDescription: opts.frame.scene_description,
      workDir: opts.workDir,
      captionBaseName: opts.captionBaseName
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
