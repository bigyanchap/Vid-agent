import Anthropic from '@anthropic-ai/sdk'
import { Mistral } from '@mistralai/mistralai'
import OpenAI from 'openai'
import {
  normalizeTextProvider,
  type TextProviderId
} from '../shared/app-settings'
import { callGemini, callGeminiSystemUser, type GeminiTurn } from './gemini'
import { loadAppSettings, resolveApiKeys } from './settings-store'

function unknownProviderMessage(provider: string): string {
  return `Unknown provider: ${provider}. Please check your Settings.`
}

export async function callTextModelSystemUser(
  systemPrompt: string,
  userMessage: string
): Promise<{ text?: string; error?: string }> {
  const s = loadAppSettings()
  const { text: apiKey } = resolveApiKeys(s)
  const raw = s.text_model.provider
  const provider = normalizeTextProvider(raw)
  if (!provider) {
    return { error: unknownProviderMessage(raw) }
  }
  if (!apiKey) {
    return {
      error:
        'Text model API key is missing. Go to Settings → Text Model to add it.'
    }
  }
  const model = s.text_model.model.trim()
  return routeTextSystemUser(provider, apiKey, model, systemPrompt, userMessage)
}

async function routeTextSystemUser(
  provider: TextProviderId,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ text?: string; error?: string }> {
  const m = model || undefined
  switch (provider) {
    case 'gemini':
      return callGeminiSystemUser(apiKey, systemPrompt, userMessage, m)
    case 'openai':
      return openaiSystemUser(apiKey, m ?? 'gpt-4o', systemPrompt, userMessage)
    case 'anthropic':
      return anthropicSystemUser(apiKey, m ?? 'claude-sonnet-4-5', systemPrompt, userMessage)
    case 'grok':
      return grokOpenAiCompatible(
        apiKey,
        'https://api.x.ai/v1/chat/completions',
        m ?? 'grok-3',
        systemPrompt,
        userMessage
      )
    case 'mistral':
      return mistralSystemUser(apiKey, m ?? 'mistral-large-latest', systemPrompt, userMessage)
    default:
      return { error: unknownProviderMessage(provider) }
  }
}

async function openaiSystemUser(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ text?: string; error?: string }> {
  try {
    const client = new OpenAI({ apiKey })
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
    const text = res.choices[0]?.message?.content ?? ''
    return { text: text || '(No response text)' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

async function anthropicSystemUser(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ text?: string; error?: string }> {
  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
    const blocks = res.content
    const text = blocks
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
    return { text: text || '(No response text)' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

async function mistralSystemUser(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ text?: string; error?: string }> {
  try {
    const client = new Mistral({ apiKey })
    const res = await client.chat.complete({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
    const text = res.choices?.[0]?.message?.content ?? ''
    const out = typeof text === 'string' ? text : ''
    return { text: out || '(No response text)' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

async function grokOpenAiCompatible(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ text?: string; error?: string }> {
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    })
    const data = (await res.json()) as {
      error?: { message?: string }
      choices?: Array<{ message?: { content?: string } }>
    }
    if (!res.ok) {
      return { error: data.error?.message ?? `Request failed (${res.status})` }
    }
    const text = data.choices?.[0]?.message?.content ?? ''
    return { text: text || '(No response text)' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

function toOpenAiRole(role: 'user' | 'model'): 'user' | 'assistant' | 'system' {
  return role === 'model' ? 'assistant' : 'user'
}

export async function callTextModelConversation(
  messages: GeminiTurn[]
): Promise<{ text?: string; error?: string }> {
  const s = loadAppSettings()
  const { text: apiKey } = resolveApiKeys(s)
  const raw = s.text_model.provider
  const provider = normalizeTextProvider(raw)
  if (!provider) {
    return { error: unknownProviderMessage(raw) }
  }
  if (!apiKey) {
    return {
      error:
        'Text model API key is missing. Go to Settings → Text Model to add it.'
    }
  }
  const model = s.text_model.model.trim()

  switch (provider) {
    case 'gemini':
      return callGemini(apiKey, messages, model || undefined)
    case 'openai': {
      try {
        const client = new OpenAI({ apiKey })
        const oaMessages = messages.map((m) => ({
          role: toOpenAiRole(m.role),
          content: m.text
        }))
        const res = await client.chat.completions.create({
          model: model || 'gpt-4o',
          messages: oaMessages
        })
        const text = res.choices[0]?.message?.content ?? ''
        return { text: text || '(No response text)' }
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }
    case 'anthropic': {
      try {
        const client = new Anthropic({ apiKey })
        const system =
          messages[0]?.role === 'model' ? messages[0].text : undefined
        const rest = system ? messages.slice(1) : messages
        const anthMessages = rest.map((m) => ({
          role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.text
        }))
        const res = await client.messages.create({
          model: model || 'claude-sonnet-4-5',
          max_tokens: 8192,
          ...(system ? { system } : {}),
          messages: anthMessages.length
            ? anthMessages
            : [{ role: 'user', content: 'Hello' }]
        })
        const text = res.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as { type: 'text'; text: string }).text)
          .join('')
        return { text: text || '(No response text)' }
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }
    case 'grok': {
      const oaMessages = messages.map((m) => ({
        role: toOpenAiRole(m.role),
        content: m.text
      }))
      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'grok-3',
            messages: oaMessages
          })
        })
        const data = (await res.json()) as {
          error?: { message?: string }
          choices?: Array<{ message?: { content?: string } }>
        }
        if (!res.ok) {
          return { error: data.error?.message ?? `Request failed (${res.status})` }
        }
        const text = data.choices?.[0]?.message?.content ?? ''
        return { text: text || '(No response text)' }
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }
    case 'mistral': {
      try {
        const client = new Mistral({ apiKey })
        const mistralMessages = messages.map((m) => ({
          role: toOpenAiRole(m.role) as 'user' | 'assistant' | 'system',
          content: m.text
        }))
        const res = await client.chat.complete({
          model: model || 'mistral-large-latest',
          messages: mistralMessages
        })
        const text = res.choices?.[0]?.message?.content ?? ''
        const out = typeof text === 'string' ? text : ''
        return { text: out || '(No response text)' }
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }
    default:
      return { error: unknownProviderMessage(raw) }
  }
}
