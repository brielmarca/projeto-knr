import { test } from "node:test";
import assert from "node:assert/strict";
import { memorySchema, systemSnapshotSchema } from "../dist/system-snapshot.js";

// Synthetic measurements live only in tests, never in a runtime fallback.
const memory = {
  totalBytes: 16 * 1024 ** 3,
  availableBytes: 4 * 1024 ** 3,
  usedBytes: 12 * 1024 ** 3,
  usagePercent: 75,
};
const snapshot = {
  schemaVersion: 1,
  collectedAt: "2026-10-07T12:00:00.000Z",
  memory,
};

test("v1 memory snapshot survives JSON validation without changing values", () => {
  assert.deepEqual(
    systemSnapshotSchema.parse(JSON.parse(JSON.stringify(snapshot))),
    snapshot,
  );
});

test("unavailable is explicit null, distinct from measured zero", () => {
  assert.equal(
    systemSnapshotSchema.parse({ ...snapshot, memory: null }).memory,
    null,
  );
  for (const availableBytes of [0, memory.totalBytes]) {
    const measured = {
      ...memory,
      availableBytes,
      usedBytes: memory.totalBytes - availableBytes,
      usagePercent: availableBytes === 0 ? 100 : 0,
    };
    assert.deepEqual(
      systemSnapshotSchema.parse({ ...snapshot, memory: measured }).memory,
      measured,
    );
  }
  for (const value of [undefined, {}, 0, false, "unavailable"]) {
    assert.equal(
      systemSnapshotSchema.safeParse({ ...snapshot, memory: value }).success,
      false,
    );
  }
});

test("rejects malformed or unsupported snapshot envelopes", () => {
  for (const value of [
    null,
    [],
    {},
    { ...snapshot, schemaVersion: undefined },
    { ...snapshot, schemaVersion: "1" },
    { ...snapshot, schemaVersion: 2 },
    { ...snapshot, collectedAt: undefined },
    { ...snapshot, collectedAt: "2026-02-30T12:00:00Z" },
    { ...snapshot, collectedAt: "2026-10-07" },
    { ...snapshot, collectedAt: 0 },
    { ...snapshot, extra: true },
  ]) {
    assert.equal(systemSnapshotSchema.safeParse(value).success, false);
  }
});

test("byte counts reject missing, nonnumeric, fractional and unsafe values", () => {
  for (const field of ["totalBytes", "availableBytes", "usedBytes"]) {
    for (const value of [
      undefined,
      null,
      "0",
      false,
      -1,
      1.5,
      NaN,
      Infinity,
      -Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      assert.equal(
        memorySchema.safeParse({ ...memory, [field]: value }).success,
        false,
        `${field}: ${String(value)}`,
      );
    }
  }
  assert.equal(
    memorySchema.safeParse({
      totalBytes: 0,
      availableBytes: 0,
      usedBytes: 0,
      usagePercent: 0,
    }).success,
    false,
  );
});

test("rejects invalid arithmetic instead of repairing derived values", () => {
  for (const patch of [
    { availableBytes: memory.totalBytes + 1 },
    { usedBytes: memory.usedBytes + 1 },
    { usedBytes: memory.totalBytes + 1 },
    { usagePercent: 75.01 },
    { usagePercent: 74.99 },
    { extra: true },
  ]) {
    assert.equal(
      memorySchema.safeParse({ ...memory, ...patch }).success,
      false,
    );
  }
  for (const value of [undefined, null, "75", NaN, Infinity, -1, 101]) {
    assert.equal(
      memorySchema.safeParse({ ...memory, usagePercent: value }).success,
      false,
    );
  }
});

test("supports safe-integer boundaries and unrounded fractional percentages", () => {
  for (const [totalBytes, availableBytes] of [
    [1, 0],
    [3, 1],
    [Number.MAX_SAFE_INTEGER, 1],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1],
  ]) {
    const usedBytes = totalBytes - availableBytes;
    const value = {
      totalBytes,
      availableBytes,
      usedBytes,
      usagePercent: (usedBytes / totalBytes) * 100,
    };
    assert.deepEqual(memorySchema.parse(value), value);
  }
  assert.equal(
    memorySchema.safeParse({
      totalBytes: 3,
      availableBytes: 1,
      usedBytes: 2,
      usagePercent: 66.67,
    }).success,
    false,
  );
});
