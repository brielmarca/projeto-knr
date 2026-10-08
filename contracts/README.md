# System snapshot v1

`system-snapshot.ts` defines the transport-independent memory snapshot shared
with the Rust collector in `native/`. This standalone package is not imported
by the frontend.

- `schemaVersion`: exactly `1`.
- `collectedAt`: an ISO 8601 UTC timestamp.
- `memory`: required; either `null` (unavailable) or physical-memory measurements.
- `totalBytes`, `availableBytes`, `usedBytes`: nonnegative JavaScript-safe integers;
  total must be positive, and used must equal total minus available.
- `usagePercent`: `(usedBytes / totalBytes) * 100`, without display rounding.

Unknown keys, inconsistent values and unsupported versions are rejected, not
normalized. Measured zero is distinct from unavailable data. Native collection
failures are returned as IPC errors instead of successful empty snapshots.

Run `npm ci --prefix contracts` followed by `npm test --prefix contracts` from
the repository root. Tests include a synthetic serialization fixture shared with
the Rust unit tests; fixtures are not runtime fallback data.
