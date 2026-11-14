# Flavor Boost — competitive gaming roadmap

Status: **design only**. No optimizer, network relay, route steering, live FPS measurement, anticheat integration, or game-specific automation is implemented by this document.

## Principles
- Keep the existing read-only Tauri snapshot and truthful disconnected UI until a feature has a real data source.
- Do not inject into games, modify protected game binaries, bypass anticheat, or install packet drivers for the initial release.
- No arbitrary PowerShell execution from the webview. Future privileged operations require a separately scoped native API, explicit consent, allowlisted operations, input validation, auditing, and Windows testing.
- Never disable Defender, Firewall, Windows Update, Vanguard, Easy Anti-Cheat, or Steam VAC protections; avoid unproven timer, HPET, registry, core parking, or global TCP recipes.
- Create verified before-state and restore capability per action before enabling it. On partial failure, revert what can be safely reverted and report anything that cannot.
- Report real before/after measurements with sample duration, timestamps, network conditions, and uncertainty. Never promise FPS or latency gains.

## Game profiles (definitions, not active tweaks)

| Game | Process detection candidate (verify signatures/paths) | Focus | Anticheat boundary |
| --- | --- | --- | --- |
| VALORANT | VALORANT-Win64-Shipping.exe | frametime consistency, network jitter/loss diagnostics, background load | Riot Vanguard |
| Fortnite | FortniteClient-Win64-Shipping.exe | CPU/GPU load, frametime consistency, background load, packet loss | Epic's anticheat protections |
| Counter-Strike 2 | cs2.exe | frametime consistency and network loss/jitter | VAC / trusted-mode compatibility |

Process name alone is insufficient to prove game identity; validate executable location and signer where feasible. Presence does not prove that a match is running. Profiles do not automatically alter user settings.

## Phases

### 1. Discovery and read-only diagnostics
- Record Windows version, CPU, GPU, RAM, disk and relevant network adapter information using native Windows APIs.
- Check active game process against a reviewed allowlist, without opening or injecting protected process memory.
- Provide opt-in, low-frequency probes to explicitly approved targets. Use RTT, jitter and packet loss where protocols permit; distinguish ICMP/TCP measurement from actual game UDP RTT.
- Detect local contention (interface utilization, Wi-Fi signal when available, competing processes) and explain unknown values.

### 2. Reversible Windows optimization engine
- Add native action registry with per-action risk, preconditions, admin requirement, diff, verification and rollback.
- Begin with user-reviewed startup/background programs and reversible Game Bar capture settings, only where supported.
- Offer Balanced / Competitive / Advanced as curated sets, never as guaranteed performance increases.
- Require explicit user approval, preserve Windows security functionality, and avoid destructive cache cleanup.

### 3. Real measurements
- Compare repeated A/B runs under similar game settings; report median and tail frametimes (where authorized and obtainable), CPU/memory overhead, RTT distribution, jitter, packet loss and failure rates.
- Collect no personal game session data by default and keep diagnostics local unless the user opts into sharing.

### 4. Optional route relay prototype
- Route optimization **requires deployed relays** and real comparisons against the ISP path; changing DNS does not route an established game UDP session.
- Prototype non-game traffic first, measuring relay RTT, throughput, reliability, regional cost, and route-to-endpoint constraints.
- Obtain game/anticheat compatibility review before attempting traffic redirection; do not promise to support all games.
- Fail open where possible, ensure clean rollback after service failure, and avoid route changes that disrupt active sessions.

## Release gates
1. Pure read-only Windows desktop builds and tests pass, including manual Windows smoke tests.
2. Every system-changing action has verified backup, rollback, telemetry and failure tests.
3. Performance overhead is measured on low-end Windows hardware; target service idle overhead <=1% CPU and <=30 MB RAM (targets, not claims).
4. Profile detection verified per supported game; anticheat compatibility validated before general release.
5. No network relay performance claims without region-specific reproducible measurements.

## Future implementation boundaries
- `src/`: display and user consent only.
- `contracts/`: versioned schemas validating native diagnostics and optimization reports.
- `native/`: read-only collectors, then narrowly scoped reviewed operations after test coverage.
- `src-tauri/`: minimal IPC commands with least-privilege capabilities.
- A separate relay service and service-host process would be designed only after phase 1 and 2 validation.

The original repository uses internal `krz-*` package, binary and contract names. They are deliberately unchanged during the cosmetic rebrand so Windows upgrades and existing imports are not unexpectedly broken. Renaming the GitHub repository itself is a separate administrative step.
