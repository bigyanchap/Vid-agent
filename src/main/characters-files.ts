import { app } from 'electron'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { CharactersDocument } from '../shared/characters-types'
import type { FragmentsDocument } from '../shared/fragments-types'

export function projectsRoot(): string {
  return join(app.getPath('userData'), 'projects')
}

export function sessionDir(sessionId: string): string {
  return join(projectsRoot(), sessionId)
}

export function skillsDir(sessionId: string): string {
  return join(sessionDir(sessionId), 'skills')
}

export function charactersPath(sessionId: string): string {
  return join(skillsDir(sessionId), 'characters.json')
}

/** Legacy path; removed on character unlock alongside fragments.json. */
export function scriptFragmentsPath(sessionId: string): string {
  return join(skillsDir(sessionId), 'script_fragments.json')
}

export function fragmentsPath(sessionId: string): string {
  return join(skillsDir(sessionId), 'fragments.json')
}

export async function removeScriptFragmentsIfAny(sessionId: string): Promise<void> {
  for (const p of [fragmentsPath(sessionId), scriptFragmentsPath(sessionId)]) {
    try {
      await unlink(p)
    } catch {
      // no file yet
    }
  }
}

export async function removeCharactersFileIfAny(sessionId: string): Promise<void> {
  try {
    await unlink(charactersPath(sessionId))
  } catch {
    // no file yet
  }
}

export function projectJsonPath(sessionId: string): string {
  return join(sessionDir(sessionId), 'project.json')
}

export async function ensureSessionProject(sessionId: string): Promise<void> {
  const dir = sessionDir(sessionId)
  const skills = skillsDir(sessionId)
  await mkdir(skills, { recursive: true })
  const pj = projectJsonPath(sessionId)
  try {
    await readFile(pj, 'utf-8')
  } catch {
    await writeFile(
      pj,
      JSON.stringify(
        { session_id: sessionId, created_at: new Date().toISOString() },
        null,
        2
      ),
      'utf-8'
    )
  }
}

export async function readCharactersFile(sessionId: string): Promise<CharactersDocument | null> {
  try {
    const raw = await readFile(charactersPath(sessionId), 'utf-8')
    return JSON.parse(raw) as CharactersDocument
  } catch {
    return null
  }
}

export async function writeCharactersFile(
  sessionId: string,
  doc: CharactersDocument
): Promise<void> {
  await ensureSessionProject(sessionId)
  const path = charactersPath(sessionId)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(doc, null, 2), 'utf-8')
}

export async function readFragmentsFile(sessionId: string): Promise<FragmentsDocument | null> {
  try {
    const raw = await readFile(fragmentsPath(sessionId), 'utf-8')
    return JSON.parse(raw) as FragmentsDocument
  } catch {
    return null
  }
}

export async function writeFragmentsFile(sessionId: string, doc: FragmentsDocument): Promise<void> {
  await ensureSessionProject(sessionId)
  const path = fragmentsPath(sessionId)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(doc, null, 2), 'utf-8')
}

export async function readProjectJson(sessionId: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(projectJsonPath(sessionId), 'utf-8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { session_id: sessionId }
  }
}

export async function mergeProjectJson(
  sessionId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await ensureSessionProject(sessionId)
  const cur = await readProjectJson(sessionId)
  await writeFile(
    projectJsonPath(sessionId),
    JSON.stringify({ ...cur, ...patch }, null, 2),
    'utf-8'
  )
}
