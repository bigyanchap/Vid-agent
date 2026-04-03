export {}

type ChatMessage = { role: 'user' | 'model'; text: string }

declare global {
  interface Window {
    api: {
      getGeminiApiKey: () => Promise<string>
      setGeminiApiKey: (key: string) => Promise<void>
      geminiChat: (messages: ChatMessage[]) => Promise<{ text?: string; error?: string }>
    }
  }
}
