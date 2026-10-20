# Native CPU, GPU, memory, and system-drive collector

Standalone Rust library; entry point: `krz_telemetry::collect_system_snapshot()`.
On Windows, it reads total and available physical memory using
`GlobalMemoryStatusEx` without elevation. Used bytes and unrounded usage percent
are derived from those measurements. Serialization matches
`contracts/system-snapshot.ts` (v1, camelCase, UTC timestamp, bytes safe for JS).

CPU model comes from the read-only `ProcessorNameString` registry value for
processor 0. `GetLogicalProcessorInformation` supplies physical cores and logical
processor masks. Two `GetSystemTimes` readings, separated by a 250 ms sleep,
supply usage: `(deltaKernel + deltaUser - deltaIdle) / (deltaKernel + deltaUser)`.
Kernel time includes idle time. The snapshot reports the actual monotonic elapsed
duration in milliseconds, and `collectedAt` is stamped at collection completion.
The Tauri command runs this sampling work on its existing blocking worker.

System-drive storage uses `GetSystemWindowsDirectoryW` to identify the Windows
installation drive (usually `C:`, but never assumed). Only that drive root is read
with `GetDiskFreeSpaceExW`; no other drives, files, or processes are enumerated.
The snapshot includes the uppercase drive letter in `volume`, total/free/used
bytes, and unrounded free percentage. Total bytes and free bytes both use the
current user's quota-aware values; used bytes are total minus free. This avoids
mixing volume-wide free bytes with a quota-limited total. Invalid paths, failed
API calls, unsafe byte counts, and inconsistent measurements return explicit
errors rather than a guessed drive or a fabricated zero measurement.

This first implementation supports a single Windows processor group. Multi-group
hosts return `UnsupportedCpuTopology`, because `GetSystemTimes` only measures the
calling thread's group there. It never presents partial-group usage as system usage.

GPU collection uses DXGI `CreateDXGIFactory1`, `EnumAdapters1`, and `GetDesc1`.
Software adapters are excluded; all enumerated hardware adapters are retained,
including integrated and discrete GPUs. Enumeration is bounded to 32 adapters
(including software entries), with excess entries rejected rather than truncated.
Names come from the driver description. Known PCI vendor IDs map to NVIDIA, AMD,
Intel, Microsoft, or Qualcomm; unknown manufacturers remain `null`.
`DedicatedVideoMemory` is read at pointer width, so capacities above 4 GiB are
preserved on supported Windows x64 builds. Zero or unsafe capacities become
`vramBytes: null`; shared/system memory is never substituted. This is reported
dedicated capacity, not utilization, free VRAM, or GPU health. No D3D device,
shell, elevation, or process enumeration is used. COM interfaces are released
through the typed `windows` bindings (the version already used by Tauri).
The native crate requires Rust 1.82+ for those bindings; use stable for desktop builds.

Errors are explicit: `UnsupportedPlatform`, `WindowsApi { code }`, `InvalidMemory`,
`CpuWindowsApi { code }`, `InvalidCpu`, `UnsupportedCpuTopology`,
`StorageWindowsApi { code }`, `InvalidStorage`, `GpuApi { code }` (HRESULT),
or `InvalidGpu`. Any collection
failure rejects the whole snapshot, including memory. Non-Windows builds return
`UnsupportedPlatform`; all Windows API code and dependencies are cfg-gated.

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
The shared snapshot fixtures are synthetic test data, not runtime fallbacks.
