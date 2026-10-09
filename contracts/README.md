# System snapshot v1

`system-snapshot.ts` defines the transport-independent CPU and memory snapshot shared
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

Unknown keys, inconsistent values and unsupported versions are rejected, not
normalized. Measured zero is distinct from unavailable data. Native collection
failures are returned as IPC errors instead of successful empty snapshots.

Run `npm ci --prefix contracts` followed by `npm test --prefix contracts` from
the repository root. Tests include a synthetic serialization fixture shared with
the Rust unit tests; fixtures are not runtime fallback data.
