import { fal } from '@fal-ai/client'
import RunwayML from '@runwayml/sdk'
import { writeFile } from 'fs/promises'
import {
  normalizeVideoProvider,
  type VideoProviderId
} from '../shared/app-settings'
import { generateVideoWithVeo } from './clips-genai'
import { generateStillToPath } from './provider-image'
import { stillPngToMp4WithCaption } from './ffmpeg-still-to-mp4'
import { loadAppSettings, resolveApiKeys } from './settings-store'

function unknownProviderMessage(provider: string): string {
  return `Unknown provider: ${provider}. Please check your Settings.`
}

export type StabilityClipExtras = {
  stillPngPath: string
  workDir: string
  captionBaseName: string
  sceneDescription: string
}

export async function routeClipTextToVideo(opts: {
  prompt: string
  durationSeconds: 4 | 6 | 8
  downloadPath: string
  stabilityExtras?: StabilityClipExtras
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = loadAppSettings()
  const keys = resolveApiKeys(s)
  const raw = s.video_model.provider
  const provider = normalizeVideoProvider(raw)
  if (!provider) {
    return { ok: false, error: unknownProviderMessage(raw) }
  }
  const apiKey = keys.video.trim()
  if (!apiKey) {
    return {
      ok: false,
      error:
        'Video model API key is missing. Go to Settings → Video Model to add it.'
    }
  }
  const model = s.video_model.model.trim()
  return routeVideo(
    provider,
    apiKey,
    model,
    opts.prompt,
    opts.durationSeconds,
    opts.downloadPath,
    opts.stabilityExtras
  )
}

async function downloadUrlToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
}

async function routeVideo(
  provider: VideoProviderId,
  apiKey: string,
  model: string,
  prompt: string,
  durationSeconds: 4 | 6 | 8,
  downloadPath: string,
  stabilityExtras?: StabilityClipExtras
): Promise<{ ok: true } | { ok: false; error: string }> {
  const promptText = prompt.slice(0, 4000)

  switch (provider) {
    case 'veo2':
    case 'veo3':
      return generateVideoWithVeo({
        apiKey,
        model: model || undefined,
        prompt: promptText,
        durationSeconds,
        downloadPath
      })
    case 'runwaygen2':
    case 'runwaygen3':
      return runwayTextToVideo(apiKey, promptText, durationSeconds, downloadPath)
    case 'pika':
      return falTextToVideo(apiKey, 'fal-ai/pika/v2.2/text-to-video', promptText, downloadPath)
    case 'kling':
      return falTextToVideo(
        apiKey,
        'fal-ai/kling-video/v2/master/text-to-video',
        promptText,
        downloadPath
      )
    case 'seedance':
      return falTextToVideo(
        apiKey,
        'fal-ai/bytedance/seedance/v1/lite/text-to-video',
        promptText,
        downloadPath
      )
    case 'stability': {
      if (!stabilityExtras) {
        return {
          ok: false,
          error:
            'Stability video clip path requires internal layout data. Use another video provider or retry from the clip pipeline.'
        }
      }
      const img = await generateStillToPath({
        prompt: promptText,
        pngPath: stabilityExtras.stillPngPath
      })
      if (!img.ok) return img
      try {
        await stillPngToMp4WithCaption({
          stillPngPath: stabilityExtras.stillPngPath,
          outMp4Path: downloadPath,
          durationSeconds,
          sceneDescription: stabilityExtras.sceneDescription,
          workDir: stabilityExtras.workDir,
          captionBaseName: stabilityExtras.captionBaseName
        })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    }
    default:
      return { ok: false, error: unknownProviderMessage(provider) }
  }
}

async function runwayTextToVideo(
  apiKey: string,
  promptText: string,
  durationSeconds: 4 | 6 | 8,
  downloadPath: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = new RunwayML({ apiKey })
    const dur = Math.min(10, Math.max(2, durationSeconds))
    const createPromise = client.textToVideo.create({
      model: 'gen4.5',
      promptText,
      ratio: '1280:720',
      duration: dur
    })
    const completed = await createPromise.waitForTaskOutput({ timeout: 600_000 })
    const url = completed.output?.[0]
    if (!url) {
      return { ok: false, error: 'Runway returned no output URL.' }
    }
    await downloadUrlToFile(url, downloadPath)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function falTextToVideo(
  apiKey: string,
  endpointId: string,
  promptText: string,
  downloadPath: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    fal.config({ credentials: apiKey })
    const result = await fal.subscribe(endpointId, {
      input: { prompt: promptText }
    })
    const data = result.data as { video?: { url?: string }; video_url?: string }
    const url = data.video?.url ?? data.video_url
    if (!url) {
      return { ok: false, error: 'fal.ai returned no video URL.' }
    }
    await downloadUrlToFile(url, downloadPath)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
