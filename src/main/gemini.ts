export type GeminiTurn = { role: 'user' | 'model'; text: string }

export async function callGemini(
  apiKey: string,
  messages: GeminiTurn[]
): Promise<{ text?: string; error?: string }> {
  if (!apiKey) {
    return { error: 'Add a Gemini API key in Settings (gear icon).' }
  }

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    encodeURIComponent(apiKey)

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
