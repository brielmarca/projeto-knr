import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { systemSnapshotSchema } from "../dist/system-snapshot.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../fixtures/cpu-memory-snapshot.json", import.meta.url),
    "utf8",
  ),
);

test("CPU fixture and unavailable/legacy CPU validate", () => {
  assert.deepEqual(systemSnapshotSchema.parse(snapshot), snapshot);
  for (const cpu of [null, undefined]) {
    assert.equal(
      systemSnapshotSchema.safeParse({ ...snapshot, cpu }).success,
      true,
    );
  }
  for (const usagePercent of [0, 100]) {
    assert.equal(
      systemSnapshotSchema.safeParse({
        ...snapshot,
        cpu: { ...snapshot.cpu, usagePercent },
      }).success,
      true,
    );
  }
});

test("rejects invalid CPU identity, topology, samples and unknown fields", () => {
  for (const patch of [
    { model: " " },
    { model: "a".repeat(513) },
    { model: null },
    { logicalCoreCount: 0 },
    { logicalCoreCount: 1.5 },
    { physicalCoreCount: 17 },
    { physicalCoreCount: 0 },
    { usagePercent: -1 },
    { usagePercent: 101 },
    { usagePercent: NaN },
    { usagePercent: Infinity },
    { usagePercent: "25" },
    { sampleDurationMs: 0 },
    { sampleDurationMs: 0.5 },
    { sampleDurationMs: Number.MAX_SAFE_INTEGER + 1 },
    { extra: true },
  ]) {
    assert.equal(
      systemSnapshotSchema.safeParse({
        ...snapshot,
        cpu: { ...snapshot.cpu, ...patch },
      }).success,
      false,
      JSON.stringify(patch),
    );
  }
});
