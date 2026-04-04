# Vid-Agent

**Vid-Agent** is a desktop application for an agentic video-generation workflow. The shell follows a **Cursor / VS Code–style layout** (**Electron + React + Vite**, not Next.js) so it feels natural next to editors like Cursor, while the workspace grows into video preview, timelines, and agent tools.

## Current status

### Phase 2 (latest)

- **Cursor warm light theme (screenshot-matched):** cream main surface `#F3F0E0`, tan chrome `#E6E1CF`, active/hover panels `#D9D4BA`, charcoal-brown text, muted blue `#3B82F6` for focus and subtitle accent, olive primary actions `#A6995F` with white label (send, Insert a Sample Story, Save).
- **Layout:** narrow **activity bar** (settings at the bottom), **main workspace** at **3/5** (tabs: Story, Characters, **Fragmented Script**, Clips, **Video**), **Agent Chat** at **2/5** with blended composer (`#2596be` draft text, 10px, multiline). **Suggested reply** pills (slate `#5F6D7E`) above the composer; **Generate Characters and Fragments** runs the character pipeline (requires non-empty story); other two suggestions remain disabled (“coming soon”).
- **Characters pipeline:** Story tab → suggestion **Generate Characters and Fragments** → main process calls **Gemini** (`gemini-3.1-pro-preview`) with the system prompt in `src/lib/prompts/characters.ts` and the story as the user message → JSON parsed (markdown fences stripped) → saved under `userData/projects/{session_id}/skills/characters.json` with `meta.approved` / `meta.locked` **false**. **Characters** tab shows warm-theme cards (cream fields, inline label/value rows, compact type); per-character **Save Changes** and meta **Save to disk**; **Approve & Proceed** writes `approved`/`locked` **true** and unlocks **Fragmented Script**.
- **Settings:** gear saves **`GEMINI_API_KEY`** under app user data (`vid-agent-config.json`).

### Stack

[Electron](https://www.electronjs.org/), [electron-vite](https://electron-vite.org/), [TypeScript](https://www.typescriptlang.org/), [React](https://react.dev/), CSS.

## Prerequisites

- Node.js (LTS recommended); see `requirements.md`.
- A [Google AI Studio](https://aistudio.google.com/) API key.

## Scripts

| Command         | Description                                      |
| --------------- | ------------------------------------------------ |
| `npm install`   | Install dependencies                             |
| `npm run dev`   | Run the app in development with HMR              |
| `npm run build` | Compile main, preload, and renderer to `./out`   |
| `npm run preview` | Run a production build locally (after `build`) |

## Configuration & project data

| Item | Location |
| ---- | -------- |
| Gemini API key | `vid-agent-config.json` in Electron `app.getPath('userData')`. |
| Session project | `userData/projects/{session_id}/project.json` (created on first character generation). |
| Characters | `userData/projects/{session_id}/skills/characters.json`. |

Each app run uses a new `session_id` (UUID) in memory; reload starts a new session unless you add persistence later.

## Project layout

| Path | Role |
| ---- | ---- |
| `src/main/` | Main process, IPC, Gemini, `characters-files`, `characters-generate` |
| `src/lib/prompts/` | Long-form Gemini system prompts (e.g. `characters.ts`) |
| `src/shared/` | Shared types (`characters-types.ts`) |
| `src/preload/` | Context bridge (`window.api`) |
| `src/renderer/` | React UI (`CharactersView`, etc.) |
| `resources/` | Packaged assets (e.g. app icon) |

## Documentation

- **`requirements.md`** — runtime, stack, changelog.

## License

MIT
