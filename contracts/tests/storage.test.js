import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { systemSnapshotSchema } from "../dist/system-snapshot.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../fixtures/system-snapshot.json", import.meta.url),
    "utf8",
  ),
);

test("system-drive snapshot and legacy/unavailable storage validate", () => {
  assert.deepEqual(systemSnapshotSchema.parse(snapshot), snapshot);
  for (const storage of [undefined, null]) {
    assert.equal(
      systemSnapshotSchema.safeParse({ ...snapshot, storage }).success,
      true,
    );
  }
  assert.equal(
    systemSnapshotSchema.safeParse({
      ...snapshot,
      storage: { ...snapshot.storage, volume: "D:" },
    }).success,
    true,
  );
});

test("storage preserves full, empty, fractional and safe-integer boundary measurements", () => {
  for (const [totalBytes, freeBytes] of [
    [1, 0],
    [1, 1],
    [3, 1],
    [Number.MAX_SAFE_INTEGER, 0],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1],
  ]) {
    const storage = {
      volume: "C:",
      totalBytes,
      freeBytes,
      usedBytes: totalBytes - freeBytes,
      freePercent: (freeBytes / totalBytes) * 100,
    };
    assert.deepEqual(
      systemSnapshotSchema.parse({ ...snapshot, storage }).storage,
      storage,
    );
  }
});

test("rejects invalid volume, byte counts, free percentage and inconsistent arithmetic", () => {
  for (const patch of [
    { volume: "" },
    { volume: "c:" },
    { volume: "C:\n" },
    { volume: "C:\\" },
    { volume: "C:\\Windows" },
    { volume: "\\\\server\\share" },
    { volume: "<script>" },
    { totalBytes: 0 },
    { totalBytes: Number.MAX_SAFE_INTEGER + 1 },
    { totalBytes: "512" },
    { freeBytes: -1 },
    { freeBytes: snapshot.storage.totalBytes + 1 },
    { freeBytes: 0.5 },
    { freeBytes: undefined },
    { usedBytes: 0 },
    { usedBytes: NaN },
    { freePercent: -1 },
    { freePercent: 101 },
    { freePercent: "25" },
    { freePercent: Infinity },
    { freePercent: NaN },
    { freePercent: 24.99 },
    { extra: true },
  ]) {
    assert.equal(
      systemSnapshotSchema.safeParse({
        ...snapshot,
        storage: { ...snapshot.storage, ...patch },
      }).success,
      false,
      JSON.stringify(patch),
    );
  }
  assert.equal(
    systemSnapshotSchema.safeParse({
      ...snapshot,
      storage: {
        volume: "C:",
        totalBytes: 3,
        freeBytes: 1,
        usedBytes: 2,
        freePercent: 33.33,
      },
    }).success,
    false,
  );
});
