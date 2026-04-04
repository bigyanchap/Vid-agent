import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { CharactersDocument } from '../shared/characters-types'

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
