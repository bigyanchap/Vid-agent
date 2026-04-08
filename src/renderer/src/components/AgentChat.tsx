import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { Send } from 'lucide-react'
import { btnNextHint, btnNextHintWrapClassNames } from '../styles/buttonNextHint'

type GeminiTurn = { role: 'user' | 'model'; text: string }

type Line =
  | { id: string; kind: 'user'; text: string }
  | {
      id: string
      kind: 'model'
      text: string
      clipAction?: 'proceed-clips' | 'proceed-video'
    }
  | { id: string; kind: 'error'; text: string }

let idSeq = 0
function nextId(): string {
  idSeq += 1
  return `m-${idSeq}`
}

const WELCOME_MESSAGE =
  'StoryFlow ready. Write your story and press Generate Characters to begin.'

const GENERATE_CHARACTERS_FROM_STORY = 'Generate Characters from Story'

const CHARACTERS_APPROVE_SUGGESTION = 'Approve characters and continue'

export type AgentChatHandle = {
  appendLine: (kind: 'user' | 'model' | 'error', text: string) => void
  appendModelWithClipAction: (text: string, clipAction: 'proceed-clips' | 'proceed-video') => void
}

type ChatContext = 'story' | 'characters' | 'other'

type AgentChatProps = {
  chatContext: ChatContext
  storyReady?: boolean
  charactersGenerating?: boolean
  charactersApproving?: boolean
  canApproveCharacters?: boolean
  onGenerateCharacters?: () => void
  /** Soft pulse + spectrum border on the story suggestion after a long sample insert. */
  gentlePulseGenerateCharacters?: boolean
  onApproveCharactersFromChat?: () => void
  clipsGenerating?: boolean
  onProceedToClipGeneration?: () => void
  onProceedToFinalVideo?: () => void
}

function PipelineSpinner({ caption }: { caption: string }) {
  const gradientId = useId().replace(/:/g, '')
  return (
    <div className="chat-bubble chat-bubble--model chat-bubble--pipeline">
      <span className="chat-bubble__label chat-bubble__label--agent">Agent</span>
      <div className="chat-bubble__spinner-row">
        <div className="ouroboros-spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="ouroboros-spinner__svg">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9c9890" />
                <stop offset="50%" stopColor="#c4c2bb" />
                <stop offset="100%" stopColor="#5c5a56" />
              </linearGradient>
            </defs>
            <circle
              className="ouroboros-spinner__track"
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.18"
            />
            <circle
              className="ouroboros-spinner__arc"
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeDasharray="16 40.5"
              transform="rotate(-90 12 12)"
            />
          </svg>
        </div>
        <span className="chat-bubble__caption">{caption}</span>
      </div>
    </div>
  )
}

export const AgentChat = forwardRef<AgentChatHandle, AgentChatProps>(function AgentChat(
  {
    chatContext,
    storyReady = false,
    charactersGenerating = false,
    charactersApproving = false,
    canApproveCharacters = false,
    onGenerateCharacters,
    gentlePulseGenerateCharacters = false,
    onApproveCharactersFromChat,
    clipsGenerating = false,
    onProceedToClipGeneration,
    onProceedToFinalVideo
  },
  ref
) {
  const [committed, setCommitted] = useState<GeminiTurn[]>([])
  const [lines, setLines] = useState<Line[]>([
    { id: 'welcome', kind: 'model', text: WELCOME_MESSAGE }
  ])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)

  const pipelineBusy = charactersGenerating || charactersApproving || loading || clipsGenerating

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
      },
      appendModelWithClipAction(text, clipAction) {
        setLines((prev) => [...prev, { id: nextId(), kind: 'model', text, clipAction }])
        requestAnimationFrame(() => {
          requestAnimationFrame(() => scrollToBottom())
        })
      }
    }),
    [scrollToBottom]
  )

  async function handleSend(): Promise<void> {
    const text = draft.trim()
    if (!text || pipelineBusy) return

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
      <header className="agent-chat__header">Agent chat</header>
      <div className="agent-chat__messages" ref={listRef} role="log" aria-live="polite">
        {lines.map((line) => (
          <div key={line.id} className={`chat-bubble chat-bubble--${line.kind}`}>
            {line.kind === 'user' && <span className="chat-bubble__label chat-bubble__label--you">You</span>}
            {line.kind === 'model' && (
              <span className="chat-bubble__label chat-bubble__label--agent">Agent</span>
            )}
            {line.kind === 'error' && <span className="chat-bubble__label">Error</span>}
            <div className="chat-bubble__text" style={{ whiteSpace: 'pre-wrap' }}>
              {line.text}
            </div>
            {line.kind === 'model' && line.clipAction === 'proceed-clips' && (
              <div className="chat-bubble__actions">
                <button
                  type="button"
                  className="agent-chat__clip-action"
                  onClick={() => onProceedToClipGeneration?.()}
                >
                  Proceed to Clip Generation →
                </button>
              </div>
            )}
            {line.kind === 'model' && line.clipAction === 'proceed-video' && (
              <div className="chat-bubble__actions">
                <button
                  type="button"
                  className="agent-chat__clip-action"
                  onClick={() => onProceedToFinalVideo?.()}
                >
                  Proceed to Final Video →
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && <PipelineSpinner caption="Thinking…" />}
        {charactersGenerating && !loading && <PipelineSpinner caption="AI Brain is working…" />}
        {charactersApproving && !loading && !charactersGenerating && (
          <PipelineSpinner caption="Saving approval…" />
        )}
        {clipsGenerating && !loading && !charactersGenerating && !charactersApproving && (
          <PipelineSpinner caption="Generating clips…" />
        )}
      </div>
      <div className="agent-chat__composer">
        {chatContext === 'story' && (
          <div className="agent-chat__suggestions" role="group" aria-label="Suggested actions">
            {(() => {
              const disabled = pipelineBusy || !storyReady
              const pulseNext = gentlePulseGenerateCharacters && !disabled
              const btn = (
                <button
                  type="button"
                  className={`agent-chat__suggestion${pulseNext ? ` ${btnNextHint.target}` : ''}`}
                  disabled={disabled}
                  onClick={() => onGenerateCharacters?.()}
                >
                  {GENERATE_CHARACTERS_FROM_STORY}
                </button>
              )
              return pulseNext ? (
                <span className={btnNextHintWrapClassNames({ glow: true })}>{btn}</span>
              ) : (
                btn
              )
            })()}
          </div>
        )}
        {chatContext === 'characters' && (
          <div
            className="agent-chat__suggestions agent-chat__suggestions--stack"
            role="group"
            aria-label="Suggested actions"
          >
            <button
              type="button"
              className="agent-chat__suggestion"
              disabled={pipelineBusy || !canApproveCharacters}
              onClick={() => onApproveCharactersFromChat?.()}
            >
              {CHARACTERS_APPROVE_SUGGESTION}
            </button>
          </div>
        )}
        <div className="agent-chat__composer-field">
          <textarea
            ref={draftRef}
            className="agent-chat__input"
            placeholder="Message the agent..."
            rows={1}
            value={draft}
            disabled={pipelineBusy}
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
            disabled={pipelineBusy || !draft.trim()}
            aria-label="Send message"
            onClick={() => void handleSend()}
          >
            <Send size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
})
