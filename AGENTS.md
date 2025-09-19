# Repository Guidelines

## Project Structure & Module Organization
This Vite-powered Chrome extension keeps all source in `src/`. The background service worker lives in `src/background.ts`, popup bootstrap code in `src/popup.ts`, and Vue single-file pages in `src/pages/` (for example `src/pages/Popup.vue` and nested layout components). Shared UI primitives sit under `src/components/ui/`, while cross-cutting helpers go in `src/lib/`. Static assets belong in `public/`, and production bundles are emitted to `dist/`. The `@` alias resolves to `src/` for cleaner imports in both `.ts` and `.vue` files.

## Build, Test, and Development Commands
- `pnpm install` — install workspace dependencies pinned in `pnpm-lock.yaml`.
- `pnpm dev` — run the Vite dev server with the web-extension plugin; reload the unpacked extension from the printed `dist/` folder while iterating.
- `pnpm build` — type-check with `vue-tsc` and output a production-ready extension into `dist/`.
- `pnpm lint:fix` — apply the shared ESLint ruleset before committing.

## Coding Style & Naming Conventions
Author code in TypeScript with Vue 3 `<script setup>` syntax and 2-space indentation. Follow the default `@jobinjia/eslint-config` rules (console use is allowed). Name Vue components and files in PascalCase (`TabsContent.vue`), composables/utilities in camelCase (`useForwardPropsEmits`), and keep Tailwind classes declarative within templates. Prefer module-scoped helpers in `src/lib/utils.ts` when logic is reused across pages.

## Testing Guidelines
Automated tests are not configured yet; run `pnpm build` to ensure type safety and catch bundling issues. When introducing tests, colocate `*.spec.ts` files beside the code they cover and document any new scripts under `package.json` so they can be wired into CI later. Always manually validate extension flows by loading the freshly built `dist/` directory in Chrome and exercising critical storage actions.

## Commit & Pull Request Guidelines
Use short, imperative commit messages following a `type(scope): summary` pattern (e.g., `feat(popup): add quota table`) to keep history skimmable. For pull requests, include a concise description of the change, link tracking issues, call out any manual test steps performed, and add screenshots or screen recordings when UI behavior changes. Ensure lint and build commands pass locally before requesting review.

## Extension Packaging Tips
The manifest is generated via `vite-plugin-web-extension`; do not edit `dist/manifest.json` directly—change `src/manifest.json` or `package.json` metadata instead. After running `pnpm build`, upload the contents of `dist/` as an unpacked extension or zip it for store submission. Keep secrets and API keys out of source and prefer `chrome.storage` for persisted configuration.
