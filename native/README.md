# Native memory collector

Standalone Rust library; entry point: `krz_telemetry::collect_system_snapshot()`.
On Windows, it reads total and available physical memory using
`GlobalMemoryStatusEx` without elevation. Used bytes and unrounded usage percent
are derived from those measurements. Serialization matches
`contracts/system-snapshot.ts` (v1, camelCase, UTC timestamp, bytes safe for JS).

Errors are explicit: `UnsupportedPlatform`, `WindowsApi { code }`, or
`InvalidMemory`. A failed collection does not return a fabricated snapshot.
This library has no IPC or frontend connection.

Checks from the repository root:

```sh
cargo fmt --manifest-path native/Cargo.toml --check
cargo test --manifest-path native/Cargo.toml
cargo clippy --manifest-path native/Cargo.toml --all-targets -- -D warnings
npm test --prefix contracts
```

Run `cargo test` on Windows as well to exercise the real Win32 call. Cross-target
`cargo check --manifest-path native/Cargo.toml --target x86_64-pc-windows-gnu
--all-targets` checks compilation only (requires that Rust target).
The shared memory fixture is synthetic test data, not a runtime fallback.
