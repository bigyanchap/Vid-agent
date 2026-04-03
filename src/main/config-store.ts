import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type Config = {
  geminiApiKey?: string
}

function path(): string {
  return join(app.getPath('userData'), 'vid-agent-config.json')
}

export function loadConfig(): Config {
  try {
    const p = path()
    if (!existsSync(p)) return {}
    return JSON.parse(readFileSync(p, 'utf-8')) as Config
  } catch {
    return {}
  }
}

function saveConfig(next: Config): void {
  writeFileSync(path(), JSON.stringify(next, null, 2), 'utf-8')
}

export function getGeminiApiKey(): string {
  return loadConfig().geminiApiKey ?? ''
}

export function setGeminiApiKey(key: string): void {
  const cur = loadConfig()
  saveConfig({ ...cur, geminiApiKey: key.trim() })
}
