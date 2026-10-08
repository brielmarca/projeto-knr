# Native memory IPC

The desktop shell exposes one argument-free, read-only command:
`collect_system_snapshot`. Its Rust return type is
`Result<SystemSnapshotV1, SnapshotError>`.

The command runs `krz_telemetry::collect_system_snapshot` from `../native` on
Tauri's blocking worker pool. Success resolves directly to the v1 shape defined
in `contracts/system-snapshot.ts`: `schemaVersion`, `collectedAt`, and `memory`.
The frontend does not invoke the command yet.

Failures reject with a structured JSON object:

| Failure                                      | Payload                                                      |
| -------------------------------------------- | ------------------------------------------------------------ |
| Non-Windows platform, including Linux        | `{ "code": "UNSUPPORTED_PLATFORM" }`                         |
| Win32 API failure                            | `{ "code": "WINDOWS_API", "win32Code": 5 }` (actual OS code) |
| Invalid memory measurements                  | `{ "code": "INVALID_MEMORY" }`                               |
| Worker failure, including an unwinding panic | `{ "code": "COLLECTION_TASK_FAILED" }`                       |

No fabricated snapshot is returned. This collector only reads physical memory;
it does not collect CPU, GPU, storage or process data.

## Permission boundary

`build.rs` registers the command in Tauri's application ACL manifest.
`capabilities/memory-snapshot.json` grants only `allow-collect-system-snapshot`
to the local `main` window. Remote origins and other windows are denied. No
plugins, shell access, elevation or `core:default` permissions are granted.
Global Tauri API injection remains disabled.

## Development and validation

Use the existing `npm run desktop:dev` and `npm run desktop:build` scripts.
Platform-specific Rust/Tauri prerequisites are required. Windows packaging
continues to use current-user NSIS installation and the existing app identity.

From the repository root:

```sh
npm ci
npm run check
npm ci --prefix contracts
npm test --prefix contracts
cargo fmt --manifest-path native/Cargo.toml --check
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path native/Cargo.toml --locked
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path native/Cargo.toml --locked --all-targets -- -D warnings
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
```

The desktop tests exercise snapshot serialization, worker-thread execution,
collector failures, panic sanitization, and the registered IPC handler with the
production capability configuration (local main allowed; other windows and
remote origins denied). Linux additionally asserts explicit unsupported behavior.
The Windows workflow runs these tests before producing the NSIS installer and
also runs the Linux unsupported-platform tests. The IPC tests use Tauri's mock
runtime; an interactive Windows webview smoke test is separate from these checks.
