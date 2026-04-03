# Requirements

This file records **runtime and tooling expectations** for Vid-Agent. Update it whenever dependencies or supported environments change.

## Runtime

| Requirement | Notes |
| ----------- | ----- |
| **Node.js** | **22.x** (LTS track aligned with lockfile `@types/node`); newer compatible versions usually work. |
| **npm** | **10.x** or compatible (lockfile version 3). |

## Application stack

| Layer | Package / technology | Version (approx.) |
| ----- | -------------------- | ----------------- |
| Desktop shell | `electron` | ^39.x |
| Build / dev | `electron-vite`, `vite` | ^5 / ^7 |
| Language | `typescript` | ^5.9 |
| UI | `react`, `react-dom` | ^19 |
| React compilation | `@vitejs/plugin-react` | ^5 |
| Electron helpers | `@electron-toolkit/preload`, `@electron-toolkit/utils` | ^3 / ^4 |
| Packaging | `electron-builder` | ^26 |

## External services

| Service | Purpose | Credential |
| ------- | ------- | ---------- |
| **Google Gemini API** | Agent chat replies | **`GEMINI_API_KEY`** (entered in Settings, stored locally in `vid-agent-config.json` under app user data). Default model: **`gemini-2.0-flash`**. |

Outbound HTTPS from the **main process** only; the renderer does not receive the key.

## UI theme (Cursor warm light)

CSS variables in `src/renderer/src/App.css` follow the Cursor screenshot palette:

| Role | Hex | Notes |
| ---- | --- | ----- |
| Main / editor / chat body | `#F3F0E0` | Cream |
| Sidebar, headers, tab bar, composer chrome | `#E6E1CF` | Tan |
| Active tab / selected row feel | `#D9D4BA` | Soft grey-tan |
| Primary buttons, circular send | `#A6995F` → hover `#948854` | Olive / mustard, white text |
| Focus / link accent | `#3B82F6` | Muted blue |
| Body text | `#2C2820` (approx.) | Deep brown / charcoal |

## Operating systems

Development and builds are expected to work on **Windows**, **macOS**, and **Linux** (Electron baseline). CI targets can be added later.

## Change log

| Date | Change |
| ---- | ------ |
| 2026-04-03 | Phase 1: documented Electron + TypeScript + React shell; Node 22 / npm 10. |
| 2026-04-03 | Phase 2: Cursor-style light UI; activity bar + **center editor (3/5)** + **right agent panel (2/5)**; fourth tab **Video**; chat composer: thumbnail + “video” + send; Settings (`GEMINI_API_KEY`); Gemini chat + Story editor. |
| 2026-04-03 | Story toolbar: **Insert a Sample Story** kept inline next to “Write your story here... OR” (no `space-between` split). |
| 2026-04-03 | UI palette aligned to **Cursor warm light** screenshot: `#F3F0E0` / `#E6E1CF` / `#D9D4BA`, `#A6995F` actions, `#3B82F6` accents; Electron `backgroundColor` `#E6E1CF`. |
| 2026-04-03 | Agent chat: removed wireframe **video** label + thumbnail; no border between transcript and composer; **Cursor-like** combined input row. |
| 2026-04-03 | Chat composer: **textarea** auto-height from content, **12px** font, wrap without scrollbar; Enter send, Shift+Enter newline. |
