import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

type GeminiTurn = { role: 'user' | 'model'; text: string }

type Line =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'model'; text: string }
  | { id: string; kind: 'error'; text: string }

let idSeq = 0
function nextId(): string {
  idSeq += 1
  return `m-${idSeq}`
}

const STORY_SUGGESTED_REPLIES = [
  'Generate Characters and Fragments',
  'Generate Characters, Fragments, and Clips',
  'Generate whole video at once'
] as const

type AgentChatProps = {
  showStorySuggestions?: boolean
  storyReady?: boolean
  charactersGenerating?: boolean
  onGenerateCharacters?: () => void
}

export type AgentChatHandle = {
  appendLine: (kind: 'user' | 'model' | 'error', text: string) => void
}

export const AgentChat = forwardRef<AgentChatHandle, AgentChatProps>(function AgentChat(
  {
    showStorySuggestions = false,
    storyReady = false,
    charactersGenerating = false,
    onGenerateCharacters
  },
  ref
) {
  const [committed, setCommitted] = useState<GeminiTurn[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)

  const syncDraftHeight = useCallback(() => {
    const el = draftRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useLayoutEffect(() => {
    syncDraftHeight()
  }, [draft, syncDraftHeight])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      appendLine(kind, text) {
        setLines((prev) => [...prev, { id: nextId(), kind, text }])
        requestAnimationFrame(() => {
          requestAnimationFrame(() => scrollToBottom())
        })
      }
    }),
    [scrollToBottom]
  )

  async function handleSend(): Promise<void> {
    const text = draft.trim()
    if (!text || loading || charactersGenerating) return

    const userLine: Line = { id: nextId(), kind: 'user', text }
    setLines((prev) => [...prev, userLine])
    setDraft('')
    setLoading(true)
    scrollToBottom()

    const payload: GeminiTurn[] = [...committed, { role: 'user', text }]

    try {
      const res = await window.api.geminiChat(payload)
      if (res.error) {
        setLines((prev) => [...prev, { id: nextId(), kind: 'error', text: res.error ?? 'Unknown error' }])
      } else {
        const reply = res.text ?? ''
        setCommitted((c) => [...c, { role: 'user', text }, { role: 'model', text: reply }])
        setLines((prev) => [...prev, { id: nextId(), kind: 'model', text: reply }])
      }
    } catch (e) {
      setLines((prev) => [
        ...prev,
        { id: nextId(), kind: 'error', text: e instanceof Error ? e.message : String(e) }
      ])
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  return (
    <section className="agent-chat" aria-label="Agent chat">
      <header className="agent-chat__header">Agent Chat</header>
      <div className="agent-chat__messages" ref={listRef} role="log" aria-live="polite">
        {lines.length === 0 && !loading && !charactersGenerating && (
          <p className="agent-chat__empty">Ask the agent about your story, characters, or clips.</p>
        )}
        {lines.map((line) => (
          <div
            key={line.id}
            className={`chat-bubble chat-bubble--${line.kind}`}
          >
            {line.kind === 'user' && <span className="chat-bubble__label">You</span>}
            {line.kind === 'model' && <span className="chat-bubble__label">Agent</span>}
            {line.kind === 'error' && <span className="chat-bubble__label">Error</span>}
            <div className="chat-bubble__text">{line.text}</div>
          </div>
        ))}
        {charactersGenerating && !loading && (
          <div className="chat-bubble chat-bubble--model">
            <span className="chat-bubble__label">Agent</span>
            <div className="chat-bubble__text chat-bubble__typing">Calling Gemini…</div>
          </div>
        )}
        {loading && (
          <div className="chat-bubble chat-bubble--model">
            <span className="chat-bubble__label">Agent</span>
            <div className="chat-bubble__text chat-bubble__typing">Thinking…</div>
          </div>
        )}
      </div>
      <div className="agent-chat__composer">
        {showStorySuggestions && (
          <div
            className="agent-chat__suggestions"
            role="group"
            aria-label="Suggested pipeline actions"
          >
            {STORY_SUGGESTED_REPLIES.map((label) => {
              const isCharacters = label === 'Generate Characters and Fragments'
              const disabled =
                isCharacters
                  ? !storyReady || charactersGenerating
                  : true
              return (
                <button
                  key={label}
                  type="button"
                  className="agent-chat__suggestion"
                  title={isCharacters ? undefined : 'Coming soon'}
                  disabled={disabled}
                  onClick={() => {
                    if (isCharacters && onGenerateCharacters) onGenerateCharacters()
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
        <div className="agent-chat__composer-field">
          <textarea
            ref={draftRef}
            className="agent-chat__input"
            placeholder="Message the agent..."
            rows={1}
            value={draft}
            disabled={loading || charactersGenerating}
            onChange={(e) => {
              setDraft(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
          />
          <button
            type="button"
            className="agent-chat__send"
            disabled={loading || charactersGenerating || !draft.trim()}
            aria-label="Send message"
            onClick={() => void handleSend()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5.5L6 12h4v7h4v-7h4l-6-6.5z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
})
