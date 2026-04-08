import { BrowserWindow } from 'electron'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { buildClipPrompt } from '../lib/prompts/clips'
import type { CharactersDocument } from '../shared/characters-types'
import type { FragmentsDocument } from '../shared/fragments-types'
import {
  ensureFramesDir,
  frameMp4Relative,
  mergeProjectJson,
  readCharactersFile,
  readFragmentsFile,
  writeFragmentsFile
} from './characters-files'
import { VIDEO_PROVIDER_LABEL, normalizeVideoProvider } from '../shared/app-settings'
import { runFallbackStillToVideo } from './clips-genai'
import { routeClipTextToVideo, type StabilityClipExtras } from './provider-video'
import { loadAppSettings, resolveApiKeys } from './settings-store'

let pipelineRunning = false
let pauseAfterCurrentFrame = false
let activeSessionId: string | null = null

export function clipsPipelineIsBusy(): boolean {
  return pipelineRunning
}

export function clipsPause(): void {
  pauseAfterCurrentFrame = true
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

async function saveDoc(sessionId: string, doc: FragmentsDocument, frameIndex: number): Promise<void> {
  doc.meta.total_frames = doc.frames.length
  doc.meta.estimated_duration_seconds = doc.frames.reduce((s, f) => s + f.duration_seconds, 0)
  await writeFragmentsFile(sessionId, doc)
  broadcast('clips:docUpdate', { sessionId, document: doc, frameIndex })
}

function normalizeStuckGenerating(doc: FragmentsDocument): FragmentsDocument {
  return {
    ...doc,
    frames: doc.frames.map((f) => (f.status === 'generating' ? { ...f, status: 'pending' } : f))
  }
}

function loadAppKeysForClips(): {
  videoKey: string
  videoProviderRaw: string
  imageKeyForLegacy: string
} {
  const s = loadAppSettings()
  const k = resolveApiKeys(s)
  return {
    videoKey: k.video,
    videoProviderRaw: s.video_model.provider,
    imageKeyForLegacy: k.image
  }
}

async function processFrame(
  sessionId: string,
  doc: FragmentsDocument,
  frameIndex: number,
  chars: CharactersDocument
): Promise<{
  doc: FragmentsDocument
  outcome: 'veo' | 'fallback' | 'failed'
}> {
  const frame = doc.frames[frameIndex]
  const nextFrames = [...doc.frames]
  const settings = loadAppKeysForClips()
  const videoKey = settings.videoKey

  if (!videoKey) {
    nextFrames[frameIndex] = {
      ...frame,
      status: 'failed',
      error:
        'Video model API key is missing. Go to Settings → Video Model to add it.',
      video_path: null,
      used_fallback: undefined
    }
    const d = { ...doc, frames: nextFrames }
    await saveDoc(sessionId, d, frameIndex)
    return { doc: d, outcome: 'failed' }
  }

  const vp = normalizeVideoProvider(settings.videoProviderRaw)
  if (!vp) {
    nextFrames[frameIndex] = {
      ...frame,
      status: 'failed',
      error: `Unknown provider: ${settings.videoProviderRaw}. Please check your Settings.`,
      video_path: null,
      used_fallback: undefined
    }
    const d = { ...doc, frames: nextFrames }
    await saveDoc(sessionId, d, frameIndex)
    return { doc: d, outcome: 'failed' }
  }

  const framesPath = await ensureFramesDir(sessionId)
  const mp4Name = `frame_${String(frame.frame_id).padStart(3, '0')}.mp4`
  const absMp4 = join(framesPath, mp4Name)
  const relVideo = frameMp4Relative(frame.frame_id)
  const stillName = `frame_${String(frame.frame_id).padStart(3, '0')}_still.png`
  const absStill = join(framesPath, stillName)
  const capName = `frame_${String(frame.frame_id).padStart(3, '0')}_cap`

  const prompt = buildClipPrompt(frame, chars.characters, chars.meta, doc.meta)

  nextFrames[frameIndex] = {
    ...frame,
    status: 'generating',
    error: undefined
  }
  let d: FragmentsDocument = { ...doc, frames: nextFrames }
  await saveDoc(sessionId, d, frameIndex)

  const stabilityExtras: StabilityClipExtras | undefined =
    vp === 'stability'
      ? {
          stillPngPath: absStill,
          workDir: framesPath,
          captionBaseName: capName,
          sceneDescription: frame.scene_description
        }
      : undefined

  const primary = await routeClipTextToVideo({
    prompt,
    durationSeconds: frame.duration_seconds,
    downloadPath: absMp4,
    stabilityExtras
  })

  if (primary.ok) {
    nextFrames[frameIndex] = {
      ...frame,
      status: 'done',
      video_path: relVideo,
      used_fallback: false,
      error: undefined
    }
    d = { ...doc, frames: [...nextFrames] }
    await saveDoc(sessionId, d, frameIndex)
    return { doc: d, outcome: 'veo' }
  }

  const fb = await runFallbackStillToVideo({
    apiKey: settings.imageKeyForLegacy,
    frame,
    characters: chars.characters,
    charactersMeta: chars.meta,
    fragmentsMeta: doc.meta,
    stillPngPath: absStill,
    outMp4Path: absMp4,
    workDir: framesPath,
    captionBaseName: capName
  })

  if (fb.ok) {
    nextFrames[frameIndex] = {
      ...frame,
      status: 'done',
      video_path: relVideo,
      used_fallback: true,
      error: undefined
    }
    d = { ...doc, frames: [...nextFrames] }
    await saveDoc(sessionId, d, frameIndex)
    return { doc: d, outcome: 'fallback' }
  }

  const err = [primary.error, fb.error].filter(Boolean).join(' · ')
  nextFrames[frameIndex] = {
    ...frame,
    status: 'failed',
    error: err.slice(0, 2000),
    video_path: null,
    used_fallback: undefined
  }
  d = { ...doc, frames: [...nextFrames] }
  await saveDoc(sessionId, d, frameIndex)
  return { doc: d, outcome: 'failed' }
}

export async function markClipPipelineInterrupted(): Promise<void> {
  if (pipelineRunning && activeSessionId) {
    await mergeProjectJson(activeSessionId, { status: 'clips_in_progress' })
  }
}

export async function runClipPipeline(opts: {
  sessionId: string
  onlyFrameId?: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sessionId, onlyFrameId } = opts
  if (pipelineRunning) {
    return { ok: false, error: 'Clip generation is already running.' }
  }

  const chars = await readCharactersFile(sessionId)
  if (!chars) {
    return { ok: false, error: 'No characters.json found.' }
  }

  let doc = await readFragmentsFile(sessionId)
  if (!doc?.frames?.length) {
    return { ok: false, error: 'No script breakdown (fragments) found.' }
  }
  if (!doc.meta.approved || !doc.meta.locked) {
    return { ok: false, error: 'Approve the script breakdown first.' }
  }

  doc = normalizeStuckGenerating(doc)
  await writeFragmentsFile(sessionId, doc)
  broadcast('clips:docUpdate', { sessionId, document: doc, frameIndex: -1 })

  pipelineRunning = true
  activeSessionId = sessionId
  pauseAfterCurrentFrame = false

  await mergeProjectJson(sessionId, { status: 'clips_in_progress' })

  const total = doc.frames.length
  let doneBefore = doc.frames.filter((f) => f.status === 'done').length
  let pauseExit = false

  broadcast('clips:pipelineState', { sessionId, running: true, paused: false })

  const vs = loadAppSettings()
  const vProv = normalizeVideoProvider(vs.video_model.provider)
  const videoLabel = vProv ? VIDEO_PROVIDER_LABEL[vProv] : vs.video_model.provider

  if (onlyFrameId == null) {
    broadcast('clips:log', {
      sessionId,
      kind: 'model',
      text: `Starting clip generation. Processing ${total} frames one by one (${videoLabel}).`
    })
  }

  try {
    const order = [...doc.frames]
      .map((f, i) => ({ f, i }))
      .sort((a, b) => a.f.frame_id - b.f.frame_id)

    for (const { f, i } of order) {
      if (onlyFrameId != null && f.frame_id !== onlyFrameId) {
        continue
      }

      if (onlyFrameId == null && f.status === 'done') {
        continue
      }

      if (onlyFrameId == null && pauseAfterCurrentFrame) {
        pauseAfterCurrentFrame = false
        pauseExit = true
        broadcast('clips:log', {
          sessionId,
          kind: 'model',
          text: 'Paused. Press Resume to continue clip generation.'
        })
        break
      }

      const current = (await readFragmentsFile(sessionId)) ?? doc
      const liveFrame = current.frames[i]
      if (onlyFrameId == null && liveFrame.status === 'done') {
        continue
      }

      const { doc: nextDoc, outcome } = await processFrame(sessionId, current, i, chars)
      doc = nextDoc

      const doneNow = doc.frames.filter((x) => x.status === 'done').length
      if (onlyFrameId == null && doneNow > doneBefore && doneNow % 3 === 0) {
        broadcast('clips:log', {
          sessionId,
          kind: 'model',
          text: `Frame ${doneNow} of ${total} done.`
        })
      }
      doneBefore = doneNow

      if (outcome === 'fallback') {
        broadcast('clips:log', {
          sessionId,
          kind: 'model',
          text: `Frame ${f.frame_id}: ${videoLabel} path did not complete; used image fallback.`
        })
      }
      if (outcome === 'failed') {
        broadcast('clips:log', {
          sessionId,
          kind: 'error',
          text: `Frame ${f.frame_id} failed. Moving on to the next frame.`
        })
      }

      if (onlyFrameId != null) {
        break
      }

      if (onlyFrameId == null && pauseAfterCurrentFrame) {
        pauseAfterCurrentFrame = false
        pauseExit = true
        broadcast('clips:log', {
          sessionId,
          kind: 'model',
          text: 'Paused. Press Resume to continue clip generation.'
        })
        break
      }
    }

    const finalDoc = (await readFragmentsFile(sessionId)) ?? doc
    const terminal = (s: string) => {
      const u = s.trim().toLowerCase()
      return u === 'done' || u === 'failed'
    }
    const allFinished =
      finalDoc.frames.length > 0 && finalDoc.frames.every((fr) => terminal(fr.status))

    if (allFinished) {
      await mergeProjectJson(sessionId, { status: 'clips_done' })
      const successVeo = finalDoc.frames.filter((fr) => fr.status === 'done' && !fr.used_fallback).length
      const successFb = finalDoc.frames.filter((fr) => fr.status === 'done' && fr.used_fallback).length
      const fail = finalDoc.frames.filter((fr) => fr.status === 'failed').length
      broadcast('clips:log', {
        sessionId,
        kind: 'model',
        text: `All clips generated. ${successVeo} with ${videoLabel}, ${successFb} used fallback, ${fail} failed.\nReady to stitch the final video.`,
        clipAction: 'proceed-video' as const
      })
    }

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    broadcast('clips:log', { sessionId, kind: 'error', text: msg })
    return { ok: false, error: msg }
  } finally {
    pipelineRunning = false
    activeSessionId = null
    broadcast('clips:pipelineState', {
      sessionId,
      running: false,
      paused: pauseExit
    })
  }
}

export async function clipsResume(sessionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  pauseAfterCurrentFrame = false
  return runClipPipeline({ sessionId })
}

export async function regenerateClipFrame(
  sessionId: string,
  frameId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (pipelineRunning) {
    return { ok: false, error: 'Wait for the current clip job to finish.' }
  }
  const doc = await readFragmentsFile(sessionId)
  if (!doc) return { ok: false, error: 'No fragments found.' }
  const idx = doc.frames.findIndex((f) => f.frame_id === frameId)
  if (idx < 0) return { ok: false, error: 'Frame not found.' }

  const framesPath = await ensureFramesDir(sessionId)
  const mp4 = join(framesPath, `frame_${String(frameId).padStart(3, '0')}.mp4`)
  const still = join(framesPath, `frame_${String(frameId).padStart(3, '0')}_still.png`)
  try {
    await unlink(mp4)
  } catch {
    /* none */
  }
  try {
    await unlink(still)
  } catch {
    /* none */
  }

  const next: FragmentsDocument = { ...doc, frames: [...doc.frames] }
  next.frames[idx] = {
    ...next.frames[idx],
    status: 'pending',
    video_path: null,
    used_fallback: undefined,
    error: undefined
  }
  await writeFragmentsFile(sessionId, next)
  broadcast('clips:docUpdate', { sessionId, document: next, frameIndex: idx })

  broadcast('clips:log', {
    sessionId,
    kind: 'model',
    text: `Regenerating frame ${frameId}…`
  })
  const res = await runClipPipeline({ sessionId, onlyFrameId: frameId })
  if (!res.ok) {
    return res
  }
  const after = await readFragmentsFile(sessionId)
  const fr = after?.frames[idx]
  if (fr?.status === 'done') {
    broadcast('clips:log', {
      sessionId,
      kind: 'model',
      text: `Frame ${frameId} regenerated successfully.`
    })
  } else {
    broadcast('clips:log', {
      sessionId,
      kind: 'error',
      text: `Frame ${frameId} regeneration failed.`
    })
  }
  return res
}
