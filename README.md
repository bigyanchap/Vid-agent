# Vid-Agent

**Vid-Agent** is a desktop application for an agentic video-generation workflow. The shell follows a **Cursor / VS Code–style layout** (Electron + TypeScript + React) so it feels natural next to editors like Cursor, while the workspace will grow into video preview, timelines, and agent tools.

## Current status

### Phase 2 (latest)

- **Cursor warm light theme (screenshot-matched):** cream main surface `#F3F0E0`, tan chrome `#E6E1CF`, active/hover panels `#D9D4BA`, charcoal-brown text, muted blue `#3B82F6` for focus and subtitle accent, olive primary actions `#A6995F` with white label (send, Insert a Sample Story, Save).
- **Layout (wireframe):** narrow **activity bar** on the far left (settings at the bottom), **main workspace** in the **center** at **3/5** width (tabs: Story, Characters, **Fragmented Script**, Clips, **Video**), and **Agent Chat** on the **right** at **2/5** with a **Cursor-style** blended composer (soft shadow, no harsh border): **auto-growing multiline** draft at **10px** in **`#2596be`**, muted teal placeholder; **Enter** sends, **Shift+Enter** newline. While **Story** is active, three **suggested reply** pills appear **right-aligned** above the composer: slate blue `#5F6D7E`, **small white** text (UI only; actions not wired yet).
- **Settings:** gear opens a modal to save **`GEMINI_API_KEY`**, persisted under the app user-data directory (see below).
- **Agent Chat:** sends prompts to **Google Gemini** (`gemini-2.0-flash`) via the **main process** (key never shipped to the renderer). Conversation history is kept consistent for multi-turn replies.
- **Story:** large rounded editor; the line **“Write your story here... OR”** and **Insert a Sample Story** sit **side by side** above the textarea (same placeholder in the textarea). Text is fully editable for the current session (not persisted to disk yet).

### Stack

[Electron](https://www.electronjs.org/), [electron-vite](https://electron-vite.org/), [TypeScript](https://www.typescriptlang.org/), [React](https://react.dev/), CSS.

## Prerequisites

- Node.js (LTS recommended); see `requirements.md` for tracked major versions.
- A [Google AI Studio](https://aistudio.google.com/) API key for chat.

## Scripts

| Command         | Description                                      |
| --------------- | ------------------------------------------------ |
| `npm install`   | Install dependencies                             |
| `npm run dev`   | Run the app in development with HMR              |
| `npm run build` | Compile main, preload, and renderer to `./out`   |
| `npm run preview` | Run a production build locally (after `build`) |

## Configuration

| Item | Location |
| ---- | -------- |
| Saved Gemini key | `vid-agent-config.json` inside the OS app user-data folder for Vid-Agent (Electron `app.getPath('userData')`). |

## Project layout

| Path | Role |
| ---- | ---- |
| `src/main/` | Main process, IPC, Gemini HTTP calls, config file |
| `src/preload/` | Context bridge (`window.api`) |
| `src/renderer/` | React UI |
| `resources/` | Packaged assets (e.g. app icon) |

## Documentation

- Dependency and environment expectations: **`requirements.md`**.

## License

MIT
