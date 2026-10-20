import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { systemSnapshotSchema } from "../dist/system-snapshot.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../fixtures/gpu-snapshot.json", import.meta.url),
    "utf8",
  ),
);

test("GPU contract preserves multiple adapters, nullable VRAM/vendor and legacy snapshots", () => {
  assert.deepEqual(systemSnapshotSchema.parse(snapshot), snapshot);
  for (const gpus of [
    undefined,
    null,
    [],
    [{ name: "Unknown GPU", manufacturer: null, vramBytes: null }],
  ]) {
    assert.equal(
      systemSnapshotSchema.safeParse({ ...snapshot, gpus }).success,
      true,
    );
  }
});

test("GPU contract rejects malformed identities, unsafe VRAM and oversized collections", () => {
  for (const patch of [
    { name: "" },
    { name: "   " },
    { name: "x".repeat(129) },
    { name: "GPU\nname" },
    { manufacturer: "" },
    { manufacturer: "   " },
    { manufacturer: 123 },
    { manufacturer: undefined },
    { vramBytes: undefined },
    { vramBytes: -1 },
    { vramBytes: 0 },
    { vramBytes: 0.5 },
    { vramBytes: "123" },
    { vramBytes: Infinity },
    { vramBytes: Number.MAX_SAFE_INTEGER + 1 },
    { usagePercent: 50 },
  ]) {
    assert.equal(
      systemSnapshotSchema.safeParse({
        ...snapshot,
        gpus: [{ ...snapshot.gpus[0], ...patch }],
      }).success,
      false,
    );
  }
  assert.equal(
    systemSnapshotSchema.safeParse({
      ...snapshot,
      gpus: Array(33).fill(snapshot.gpus[0]),
    }).success,
    false,
  );
});
