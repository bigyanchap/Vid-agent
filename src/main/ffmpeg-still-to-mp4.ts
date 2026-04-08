import { spawn } from 'child_process'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import ffmpegStatic from 'ffmpeg-static'

function ffmpegBin(): string {
  const p = typeof ffmpegStatic === 'string' && ffmpegStatic ? ffmpegStatic : ''
  if (!p) {
    throw new Error('ffmpeg-static binary not found.')
  }
  return p
}

function runFfmpeg(args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let err = ''
    child.stderr?.on('data', (d) => {
      err += String(d)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(err.slice(-800) || `ffmpeg exited ${code}`))
    })
  })
}

/**
 * Ken Burns zoom + bottom caption bar (first 80 chars of scene_description).
 * Outputs H.264 1920×1080.
 */
export async function stillPngToMp4WithCaption(opts: {
  stillPngPath: string
  outMp4Path: string
  durationSeconds: number
  sceneDescription: string
  workDir: string
  captionBaseName: string
}): Promise<void> {
  const { stillPngPath, outMp4Path, durationSeconds, sceneDescription, workDir, captionBaseName } = opts
  const fps = 25
  const d = Math.max(1, Math.round(durationSeconds * fps))
  const caption = sceneDescription.replace(/\r?\n/g, ' ').slice(0, 80).trim() || '—'
  const capFile = join(workDir, `${captionBaseName}.txt`)
  await writeFile(capFile, caption, 'utf8')

  const vf = [
    'scale=2560:1440:force_original_aspect_ratio=increase',
    'crop=2560:1440',
    `zoompan=z='min(zoom+0.0009,1.35)':d=${d}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`,
    'format=yuv420p',
    `drawtext=textfile=${captionBaseName}.txt:reload=1:fontsize=18:fontcolor=white:x=(w-text_w)/2:y=h-text_h-14:box=1:boxcolor=black@0.55:boxborderw=10`
  ].join(',')

  const args = [
    '-y',
    '-loop',
    '1',
    '-i',
    stillPngPath,
    '-vf',
    vf,
    '-t',
    String(durationSeconds),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outMp4Path
  ]

  await runFfmpeg(args, workDir)
}
