import { GEMINI_IMAGE_MODEL } from './gemini-image-model'

export type CharacterPortraitResult =
  | { ok: true; mimeType: string; dataBase64: string }
  | { ok: false; error: string }

type InlinePart = {
  text?: string
  inline_data?: { mime_type?: string; data?: string }
  inlineData?: { mimeType?: string; data?: string }
}

function portraitUrl(apiKey: string, modelId: string): string {
  const id = modelId.trim() || GEMINI_IMAGE_MODEL
  return (
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent?key=` +
    encodeURIComponent(apiKey)
  )
}

/** @param modelId Gemini image-capable model id (e.g. from Settings). Defaults to {@link GEMINI_IMAGE_MODEL}. */
export async function generateCharacterPortrait(
  apiKey: string,
  prompt: string,
  modelId?: string
): Promise<CharacterPortraitResult> {
  if (!apiKey) {
    return { ok: false, error: 'Add a Gemini API key in Settings (gear icon).' }
  }

  const trimmed = prompt.trim()
  if (!trimmed) {
    return { ok: false, error: 'Character description is empty.' }
  }

  try {
    const res = await fetch(portraitUrl(apiKey, modelId ?? GEMINI_IMAGE_MODEL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: trimmed }] }]
      })
    })

    const data = (await res.json()) as {
      error?: { message?: string }
      promptFeedback?: { blockReason?: string }
      candidates?: Array<{
        content?: { parts?: InlinePart[] }
        finishReason?: string
      }>
    }

    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `Request failed (${res.status})` }
    }

    if (data.promptFeedback?.blockReason) {
      return { ok: false, error: `Prompt blocked: ${data.promptFeedback.blockReason}` }
    }

    const parts = data.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      const inline = part.inline_data ?? part.inlineData
      const raw = inline?.data
      if (typeof raw === 'string' && raw.length > 0) {
        const mimeType =
          (part.inline_data?.mime_type as string | undefined) ??
          (part.inlineData?.mimeType as string | undefined) ??
          'image/png'
        return { ok: true, mimeType, dataBase64: raw }
      }
    }

    const textFallback = parts.map((p) => p.text ?? '').join('').trim()
    if (textFallback) {
      return { ok: false, error: textFallback.slice(0, 500) }
    }

    return { ok: false, error: 'No image was returned. Try adjusting the character sheet or try again.' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
