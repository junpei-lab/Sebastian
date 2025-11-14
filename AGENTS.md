# Repository Guidelines

基本的に日本語で回答する。

Sebastian is a React + Tauri desktop alarm. This document summarizes how files fit together and what maintainers expect in contributions.

## Project Structure & Module Organization

- `src/` contains the Vite SPA: shared UI in `src/components`, domain contracts in `src/types/alarm.ts`, and global styles in `src/styles.css`.
- `src-tauri/src` hosts the Rust backend: `main.rs` wires the tray/window lifecycle while `alarm_store.rs` persists `alarms.json` under the OS app-data directory and drives scheduling.
- `public/` is for static assets and audio, and root-level configs (`vite.config.ts`, `tsconfig*.json`, `package.json`) define tooling.

## Build, Test, and Development Commands

- `npm install` — bootstrap Node/TypeScript dependencies (Node 18+ recommended).
- `npm run dev` — Vite dev server for the UI only.
- `npm run tauri:dev` — full desktop runtime with live Rust + frontend reloads.
- `npm run build` — type-check plus production bundle generation.
- `npm run preview` — serve the latest build for manual QA.
- `npm run tauri:build` — compile installers/bundles; requires a Rust stable toolchain.
- `cd src-tauri && cargo fmt && cargo test` — format and run any Rust-side unit tests.

## Coding Style & Naming Conventions

Use 2-space indentation, ES modules, and functional React components. Components remain PascalCase (`AlarmDialog`), hooks/utilities camelCase, and CSS classes dash-case to match `styles.css`. Centralize types in `src/types`, guard every `invoke` with error handling, and prefer pure helpers inside `alarm_store.rs`. Format via your editor’s Prettier integration plus `cargo fmt`.

## Testing Guidelines

Automated JavaScript tests are not yet wired up, so document manual checks (adding, firing, and acknowledging alarms) in each PR. When you touch Rust scheduling logic, add focused `#[cfg(test)]` blocks in `src-tauri/src/alarm_store.rs` and run `cargo test`. New frontend tests should mirror component names (`AlarmForm.test.tsx`) once Vitest is introduced.

## Commit & Pull Request Guidelines

Write imperative, sub-72-character commit subjects (e.g., `Add snooze setting`) and reference issues with `#id`. PR descriptions must include context, screenshots for UI changes, and the commands you ran (`npm run build`, `npm run tauri:build`, `cargo test`). Call out schema changes whenever `alarms.json` is touched.

## Security & Configuration Tips

User alarms live in the platform app-data directory, so keep schema changes backward compatible and avoid destructive migrations. Continue validating URLs (the UI already enforces http/https) and never block the `parking_lot::Mutex` longer than necessary; spin up background work via `tauri::async_runtime::spawn` as shown in `start_alarm_loop`.
