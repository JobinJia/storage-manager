# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Storage Manager is a Chrome extension that manages browser storage (localStorage, sessionStorage) for the active tab. Built with Vue 3, TypeScript, and Vite, using the `vite-plugin-web-extension` plugin for cross-browser manifest generation.

## Architecture

### Extension Structure

The extension consists of three main parts:

1. **Background Script** (`src/background.ts`): Minimal service worker for extension lifecycle
2. **Popup UI** (`src/popup.html` + `src/popup.ts`): Main interface rendered as browser action popup
3. **Content Injection**: Uses `chrome.scripting.executeScript()` with `world: 'MAIN'` to read/modify page storage

### Component Hierarchy

- `Popup.vue` (root, 600x500px fixed size)
  - `Header.vue`: Extension title/branding
  - `Settings.vue`: Global controls (copy mode, sync URL, clear all)
  - `Content.vue`: Tab switcher for localStorage/sessionStorage
    - `ContentList.vue`: Table of storage entries with CRUD operations

### State Management

Simple reactive store in `src/store/index.ts` using Vue's `ref()`:
- `copyType`: boolean - controls whether copy outputs JS snippet or raw value
- `syncUrl`: string - URL to sync storage from
- `refreshToken`: number - triggers data refresh when incremented

Store is NOT persisted; settings like `syncUrl` are saved per-host to `chrome.storage.local`.

### Chrome API Usage Pattern

All storage operations follow this pattern:
1. Query active tab: `chrome.tabs.query({ active: true, currentWindow: true })`
2. Execute script in tab: `chrome.scripting.executeScript({ target: { tabId }, func, args, world: 'MAIN' })`
3. Access storage: Script runs in page context to access `window.localStorage`/`sessionStorage`

Key locations:
- Read storage: `src/pages/components/ContentList.vue:48-87` (`fetchStorageData`)
- Update storage: `src/pages/components/ContentList.vue:108-148` (`persistStorageUpdate`)
- Delete storage: `src/pages/components/ContentList.vue:288-320` (`removeStorageEntry`)
- Sync from URL: `src/pages/components/Settings.vue:102-208` (`handleSyncFromUrl`)

### Manifest Generation

`vite.config.ts:8-17` merges `src/manifest.json` (static config) with `package.json` metadata. Supports Chrome MV3 and Firefox MV2 via `{{chrome}}` / `{{firefox}}` templating.

## Development Commands

```bash
# Start dev server with hot reload (port 5000)
pnpm dev

# Build extension for production
# Type-checks with vue-tsc, then bundles with Vite
pnpm build

# Lint and auto-fix code
pnpm lint:fix
```

## Testing

Vitest is configured (`vitest.config.ts`) with:
- Environment: `happy-dom` (lightweight DOM simulation)
- Setup file: `src/test/setup.ts`
- Run tests: `pnpm vitest` or `pnpm vitest run`
- Run single test: `pnpm vitest <path>` (e.g., `pnpm vitest src/store/index.test.ts`)
- Coverage: `pnpm vitest --coverage` (uses v8 provider)

Test files use `.test.ts` suffix and are located alongside source files.

## Important Conventions

### UI Components

- Uses `reka-ui` (Radix Vue) primitives in `src/components/ui/`
- Styling: Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Icons: `lucide-vue-next` for UI icons, `unplugin-icons` for auto-installation
- All component props use TypeScript interfaces defined inline

### Path Aliases

`@/*` maps to `src/*` (configured in `vite.config.ts:21-25` and `tsconfig.json:10-12`)

### Inline Editing Pattern

`src/pages/components/ContentList.vue` implements double-click-to-edit cells:
- `editingCell` ref tracks current edit (key + field)
- `editingValue` holds temporary value
- `saveEditingCell()` optimistically updates local state, then persists via Chrome API
- On persistence failure, reloads data from page to revert

### Sync URL Per-Host Persistence

`src/pages/components/Settings.vue:274-451` saves sync URL configurations per hostname:
- Storage key: `"syncUrlByHost"`
- Structure: `{ "example.com": ["https://staging.example.com", ...], ... }` (array of URLs per host)
- Auto-loads config for current tab's host on mount
- Supports multiple saved URLs per host with add/delete operations
