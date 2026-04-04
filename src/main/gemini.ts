import { GEMINI_MODEL } from './gemini-model'

export type GeminiTurn = { role: 'user' | 'model'; text: string }

function generateContentUrl(apiKey: string): string {
  return (
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=` +
    encodeURIComponent(apiKey)
  )
}

export async function callGemini(
  apiKey: string,
  messages: GeminiTurn[]
): Promise<{ text?: string; error?: string }> {
  if (!apiKey) {
    return { error: 'Add a Gemini API key in Settings (gear icon).' }
  }

  const url = generateContentUrl(apiKey)

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }]
  }))

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    })

    const data = (await res.json()) as {
      error?: { message?: string }
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }

    if (!res.ok) {
      return { error: data.error?.message ?? `Request failed (${res.status})` }
    }

    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    return { text: text || '(No response text)' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function callGeminiSystemUser(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ text?: string; error?: string }> {
  if (!apiKey) {
    return { error: 'Add a Gemini API key in Settings (gear icon).' }
  }

  const url = generateContentUrl(apiKey)

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }]
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = (await res.json()) as {
      error?: { message?: string }
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }

    if (!res.ok) {
      return { error: data.error?.message ?? `Request failed (${res.status})` }
    }

    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    return { text: text || '(No response text)' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
