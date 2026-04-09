import { BrowserWindow } from 'electron'
import { unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { buildClipPrompt } from '../lib/prompts/clips'
import type { FragmentsDocument } from '../shared/fragments-types'
import {
  ensureFramesDir,
  frameSeedRelative,
  readCharactersFile,
  readFragmentsFile,
  sessionDir,
  writeFragmentsFile
} from './characters-files'
import { generateStillToPath } from './provider-image'
import { validateImageGate } from './settings-store'

function broadcastFragments(sessionId: string, doc: FragmentsDocument, frameIndex: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('clips:docUpdate', { sessionId, document: doc, frameIndex })
    }
  }
}

function detectImageExt(buf: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png'
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg'
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp'
  }
  return null
}

async function removePreviousSeedFile(sessionId: string, relPath: string | null | undefined): Promise<void> {
  if (!relPath || typeof relPath !== 'string') return
  const abs = join(sessionDir(sessionId), ...relPath.replace(/^[/\\]+/, '').split('/'))
  try {
    await unlink(abs)
  } catch {
    /* none */
  }
}

export async function seedImageUpload(
  sessionId: string,
  frameId: number,
  dataBase64: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const doc = await readFragmentsFile(sessionId)
  if (!doc) return { ok: false, error: 'No script breakdown found.' }
  const idx = doc.frames.findIndex((f) => f.frame_id === frameId)
  if (idx < 0) return { ok: false, error: 'Frame not found.' }

  const raw = dataBase64.includes(',') ? (dataBase64.split(',')[1] ?? '') : dataBase64
  let buf: Buffer
  try {
    buf = Buffer.from(raw, 'base64')
  } catch {
    return { ok: false, error: 'Invalid image data.' }
  }
  if (buf.length < 12) return { ok: false, error: 'Image file is too small.' }

  const ext = detectImageExt(buf)
  if (!ext) {
    return { ok: false, error: 'Unsupported image format. Use PNG, JPEG, or WebP.' }
  }

  await ensureFramesDir(sessionId)
  const fr = doc.frames[idx]
  await removePreviousSeedFile(sessionId, fr.seed_image_path)

  const rel = frameSeedRelative(frameId, ext)
  const abs = join(sessionDir(sessionId), ...rel.split('/'))
  await writeFile(abs, buf)

  const next: FragmentsDocument = {
    ...doc,
    frames: doc.frames.map((f, i) => (i === idx ? { ...f, seed_image_path: rel } : f))
  }
  await writeFragmentsFile(sessionId, next)
  broadcastFragments(sessionId, next, idx)
  return { ok: true }
}

export async function seedImageGenerate(
  sessionId: string,
  frameId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = validateImageGate()
  if (!gate.ok) return { ok: false, error: gate.message }

  const doc = await readFragmentsFile(sessionId)
  if (!doc) return { ok: false, error: 'No script breakdown found.' }
  const idx = doc.frames.findIndex((f) => f.frame_id === frameId)
  if (idx < 0) return { ok: false, error: 'Frame not found.' }

  const chars = await readCharactersFile(sessionId)
  if (!chars) return { ok: false, error: 'No characters found.' }

  const frame = doc.frames[idx]
  const prompt = buildClipPrompt(frame, chars.characters, chars.meta, doc.meta)
  await ensureFramesDir(sessionId)
  await removePreviousSeedFile(sessionId, frame.seed_image_path)

  const rel = frameSeedRelative(frameId, 'png')
  const abs = join(sessionDir(sessionId), ...rel.split('/'))

  const img = await generateStillToPath({ prompt, pngPath: abs })
  if (!img.ok) return img

  const next: FragmentsDocument = {
    ...doc,
    frames: doc.frames.map((f, i) => (i === idx ? { ...f, seed_image_path: rel } : f))
  }
  await writeFragmentsFile(sessionId, next)
  broadcastFragments(sessionId, next, idx)
  return { ok: true }
}

export async function seedImageClear(
  sessionId: string,
  frameId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const doc = await readFragmentsFile(sessionId)
  if (!doc) return { ok: false, error: 'No script breakdown found.' }
  const idx = doc.frames.findIndex((f) => f.frame_id === frameId)
  if (idx < 0) return { ok: false, error: 'Frame not found.' }

  const fr = doc.frames[idx]
  await removePreviousSeedFile(sessionId, fr.seed_image_path)

  const next: FragmentsDocument = {
    ...doc,
    frames: doc.frames.map((f, i) => (i === idx ? { ...f, seed_image_path: null } : f))
  }
  await writeFragmentsFile(sessionId, next)
  broadcastFragments(sessionId, next, idx)
  return { ok: true }
}
