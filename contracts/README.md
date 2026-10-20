# System snapshot v1

`system-snapshot.ts` defines the transport-independent CPU, GPU, memory, and storage snapshot shared
with the Rust collector in `native/`. The frontend imports this local package
to validate IPC responses. Root `npm ci` builds its runtime JavaScript and types
through the `prepare` script; after editing the schema, rebuild with
`npm run build --prefix contracts`.

- `schemaVersion`: exactly `1`.
- `collectedAt`: an ISO 8601 UTC timestamp.
- `memory`: required; either `null` (unavailable) or physical-memory measurements.
- `totalBytes`, `availableBytes`, `usedBytes`: nonnegative JavaScript-safe integers;
  total must be positive, and used must equal total minus available.
- `usagePercent`: `(usedBytes / totalBytes) * 100`, without display rounding.
- `cpu`: optional for existing memory-only v1 producers; missing or `null` means
  unavailable. Contains `model` (nonblank, at most 512 UTF-16 code units),
  `logicalCoreCount` and `physicalCoreCount` (positive safe integers, physical
  not greater than logical), `usagePercent` (finite, 0–100, unrounded), and
  `sampleDurationMs` (positive safe integer, actual elapsed sampling time).
  CPU usage is an interval average, not a live or instantaneous measurement.
- `storage`: optional for older v1 producers; missing or `null` means unavailable.
  Contains `volume` (uppercase drive letter plus colon, e.g. `C:`), `totalBytes`,
  `freeBytes`, `usedBytes`, and `freePercent`. Byte counts are nonnegative safe
  integers; total must be positive, free cannot exceed total, and used must equal
  total minus free. Free percentage equals `(freeBytes / totalBytes) * 100`
  without display rounding. Zero free bytes is a valid full-drive measurement.
  These are the system drive's capacity and free space available to the current
  Windows user, including disk quota limits; they are not physical disk size,
  storage health, or activity measurements. The meter represents free space.

- `gpus`: optional for older v1 producers; missing or `null` means unavailable.
  An array of up to 32 hardware adapters; `[]` means enumeration succeeded with
  no hardware adapters reported. Each entry contains `name` (nonblank, 1–128 UTF-16 units,
  no ASCII control characters), `manufacturer` (same string limits or `null`
  for an unknown vendor), and `vramBytes` (positive safe integer or `null`).
  VRAM means DXGI-reported dedicated video-memory capacity, never shared system
  memory, available memory, utilization, or health. Zero/unsafe DXGI capacities
  become `null`; no capacity is inferred. Adapter ordering does not identify a
  preferred GPU, and capacities must not be summed as a usable memory pool.

- `processes`: optional for older v1 producers; missing or `null` means unavailable.
  At most 128 readable processes, sorted by `workingSetBytes` descending, then
  `pid` ascending. PIDs are unique positive uint32 values. `name` is the executable
  basename (1–260 UTF-16 units, nonblank, no ASCII controls or path separators).
  `workingSetBytes` is a nonnegative safe integer, including shared resident pages;
  it is not private memory or an estimate of reclaimable memory. Do not sum working
  sets as system usage. Zero is valid. Protected/exiting or invalid entries are
  skipped; `[]` means enumeration succeeded with no readable entries, not that
  Windows has no processes. The list is best-effort, capped, and collected once,
  not an exhaustive inventory or an atomic/live sample. Enumeration failure rejects
  the snapshot. The frontend retains the list in state without adding process actions.

Storage drive selection follows the Windows installation directory, including
non-`C:` installations. Consumers must use the reported `volume`. A diagnostic
whose evidence contract specifically requires `C:` cannot use a different
installation drive as equivalent evidence. The current desktop path only
displays telemetry; diagnostics and recommendations remain unevaluated.

Unknown keys, inconsistent values and unsupported versions are rejected, not
normalized. Measured zero is distinct from unavailable data. Native collection
failures are returned as IPC errors instead of successful empty snapshots.

Run `npm ci --prefix contracts` followed by `npm test --prefix contracts` from
the repository root. Tests include a synthetic serialization fixture shared with
the Rust unit tests; fixtures are not runtime fallback data.
