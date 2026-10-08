# Project guidance

## Priorities and architecture
- Preserve the approved dashboard, accessibility, honest disconnected behavior, and working web/Windows packaging while preparing for real Agent integration.
- Use `README.md` and `package.json` for setup and commands. The frontend is vanilla JavaScript ES modules, strict JSDoc typechecking, Vite, and Tailwind 3; do not introduce a framework casually.
- `src/components/` renders UI; `src/interactions.js` handles interaction; `src/data/state.js` defines disconnected telemetry; `src/data/mock.js` is development-only. Keep fixtures excluded from production.
- `src-tauri/` is a Tauri 2 shell exposing a read-only memory snapshot command backed by `native/` and the v1 schema in `contracts/`. `src/data/memory-ipc.js` invokes it only inside Tauri at startup, validates the response, and populates only memory; browser dev fixtures remain separate. No Agent, optimization engine, PowerShell execution, HTTP API client, or PostgreSQL integration exists; `backend/` remains a placeholder. Keep privileged operations out of frontend code.
- `screen.png` and the current product brief are visual authority; `DESIGN.md` is legacy. Preserve shared tokens/styles, both `/` and `/code.html`, and supported desktop layouts. Avoid incidental redesigns, dependency upgrades, or lockfile churn.

## Windows, Agent, and diagnostics
- Keep Vite's loopback host/port aligned with Tauri's `devUrl`. `VITE_API_URL` is compile-time, public configuration reserved for future integration; never put secrets in it.
- Preserve the single local-main-window memory capability, disabled global Tauri API, CSP restrictions, and current-user NSIS installation unless a scoped requirement justifies changes. Do not add shell access or elevation as a workaround.
- Missing telemetry stays unavailable/unknown; applying changes remains disabled without a real engine. Never present simulated scans, findings, performance gains, restore points, or optimizations as real. Future system-changing Agent operations require explicit authorization and verified results; never promise restoration without evidence.
- Diagnose from code, reproducible steps, command output, or logs. Separate observations from hypotheses; report the tested platform and unverified behavior. A web build or Linux check does not prove Windows installer/native behavior.
- Windows x64 artifacts come from `.github/workflows/windows-desktop-build.yml` on `windows-latest`. Desktop commands require Rust and platform-specific Tauri prerequisites; verify Windows packaging on Windows or through that workflow.

## Minimal-change workflow and Git safety
- Inspect `git status` and relevant diffs first; preserve existing tracked and untracked work. Never reset, clean, overwrite, or discard unrelated changes. Stage only intended files; commit, push, or rewrite history only when explicitly requested.
- Read only relevant source and documentation. Exclude dependencies, build output, generated Tauri files, and test artifacts from broad searches; consult the long research report only when relevant. Reuse observed facts instead of repeatedly scanning the repository.
- Make the smallest coherent change. Keep secrets, local runtime data, and generated artifacts out of Git; respect `.gitignore`.
- Use Node.js 22.12+ and `npm ci` for installation. `npm run check` covers formatting, lint, types, Node tests, and production build; use `npm run test:e2e` for browser behavior/layout changes (Chromium required). Add desktop verification when touching Tauri. Run relevant checks, report blockers honestly, and avoid repeated successful runs without new changes. `npm run format` writes broadly; prefer formatting only touched files.
- One scoped task per session. When complete, summarize changes and verification, stop, and print `NEW SESSION SAFE`. If blocked or incomplete, state what remains rather than claiming completion.
