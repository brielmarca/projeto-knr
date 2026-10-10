import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectMemoryState } from "../src/data/memory-ipc.js";
import {
  connectionLabel,
  telemetryLabel,
  unavailableState,
} from "../src/data/state.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../contracts/fixtures/system-snapshot.json", import.meta.url),
    "utf8",
  ),
);
const collect = (response) =>
  collectMemoryState({
    isDesktop: () => true,
    invokeCommand: async (command) => {
      assert.equal(command, "collect_system_snapshot");
      return response;
    },
  });

test("maps system-drive free space without inventing health or other telemetry", async () => {
  const state = await collect(snapshot);
  assert.deepEqual(state.storage, snapshot.storage);
  assert.deepEqual(state.hardware[3], {
    label: "Storage",
    name: "System drive C:",
    value: "25% free",
    detail: "128.0 / 512.0 GiB",
    percent: 25,
    percentKind: "free",
  });
  assert.equal(connectionLabel(state), "CPU + Memory + Storage");
  assert.equal(
    telemetryLabel(state),
    "Native snapshot · CPU + Memory + Storage",
  );
  for (const index of [1, 4])
    assert.deepEqual(state.hardware[index], unavailableState().hardware[index]);
  for (const key of ["impacts", "audit", "findings", "restore", "results"])
    assert.deepEqual(state[key], unavailableState()[key]);
});

test("storage-only snapshots preserve non-C drives, zero free, fully free and precision", async () => {
  for (const freeBytes of [0, 1, 3]) {
    const freePercent = (freeBytes / 3) * 100;
    const state = await collect({
      ...snapshot,
      memory: null,
      cpu: null,
      storage: {
        volume: "D:",
        totalBytes: 3,
        freeBytes,
        usedBytes: 3 - freeBytes,
        freePercent,
      },
    });
    assert.equal(state.source, "native");
    assert.equal(connectionLabel(state), "Storage only");
    assert.equal(state.hardware[3].percent, freePercent);
    assert.equal(state.hardware[3].name, "System drive D:");
    assert.equal(
      state.hardware[3].value,
      `${Number(freePercent.toFixed(1))}% free`,
    );
    assert.deepEqual(state.hardware[2], unavailableState().hardware[2]);
  }
});

test("missing and null storage stay unavailable while other native metrics survive", async () => {
  for (const storage of [undefined, null]) {
    const state = await collect({ ...snapshot, storage });
    assert.equal(state.source, "native");
    assert.equal(connectionLabel(state), "CPU + Memory");
    assert.equal(state.storage, undefined);
    assert.deepEqual(state.hardware[3], unavailableState().hardware[3]);
  }
});

test("malformed storage rejects the snapshot instead of repairing or displaying it", async () => {
  for (const patch of [
    { volume: "<img src=x onerror=alert(1)>" },
    { usedBytes: 1 },
    { freePercent: 75 },
    { totalBytes: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    const state = await collect({
      ...snapshot,
      storage: { ...snapshot.storage, ...patch },
    });
    assert.equal(state.memoryTelemetry.status, "error");
    assert.equal(
      state.memoryTelemetry.message,
      "The native snapshot failed validation.",
    );
    assert.deepEqual(state.hardware, unavailableState().hardware);
  }
});

test("storage native errors remain explicit, sanitized and disconnected", async () => {
  for (const [code, message] of [
    ["STORAGE_WINDOWS_API", "Windows could not read system-drive storage."],
    [
      "INVALID_STORAGE",
      "The native collector returned invalid system-drive measurements.",
    ],
  ]) {
    const state = await collectMemoryState({
      isDesktop: () => true,
      invokeCommand: async () => {
        throw { code, win32Code: 5, message: "private details" };
      },
    });
    assert.equal(state.memoryTelemetry.status, "error");
    assert.equal(state.memoryTelemetry.message, message);
    assert.equal(state.storage, undefined);
    assert.deepEqual(state.hardware, unavailableState().hardware);
  }
});
