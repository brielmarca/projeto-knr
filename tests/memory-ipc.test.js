import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectMemoryState } from "../src/data/memory-ipc.js";
import { unavailableState } from "../src/data/state.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../contracts/fixtures/memory-snapshot.json", import.meta.url),
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

test("browser never calls native IPC", async () => {
  assert.deepEqual(
    await collectMemoryState({
      invokeCommand: () => {
        throw new Error("must not invoke outside Tauri");
      },
    }),
    unavailableState(),
  );
});

test("shared native fixture maps only memory with truthful units and full meter precision", async () => {
  const state = await collect(snapshot);
  assert.equal(state.source, "native");
  assert.deepEqual(
    state.hardware.find((metric) => metric.label === "Memory"),
    {
      label: "Memory",
      name: "Physical memory",
      value: "75%",
      detail: "12.0 / 16.0 GiB",
      percent: 75,
    },
  );
  assert.equal(state.memoryTelemetry.collectedAt, snapshot.collectedAt);
  const disconnected = unavailableState();
  assert.deepEqual(
    state.hardware.filter((metric) => metric.label !== "Memory"),
    disconnected.hardware.filter((metric) => metric.label !== "Memory"),
  );
  for (const key of ["impacts", "audit", "findings", "restore", "results"]) {
    assert.deepEqual(state[key], disconnected[key]);
  }
  const fractional = await collect({
    ...snapshot,
    memory: {
      totalBytes: 3,
      availableBytes: 1,
      usedBytes: 2,
      usagePercent: (2 / 3) * 100,
    },
  });
  assert.equal(fractional.hardware[2].percent, (2 / 3) * 100);
});

test("measured zero and fully used memory remain measurements, while null stays unavailable", async () => {
  for (const availableBytes of [0, snapshot.memory.totalBytes]) {
    const usedBytes = snapshot.memory.totalBytes - availableBytes;
    const state = await collect({
      ...snapshot,
      memory: {
        ...snapshot.memory,
        availableBytes,
        usedBytes,
        usagePercent: (usedBytes / snapshot.memory.totalBytes) * 100,
      },
    });
    assert.equal(state.source, "native");
    assert.equal(state.hardware[2].percent, availableBytes === 0 ? 100 : 0);
  }
  const state = await collect({ ...snapshot, memory: null });
  assert.equal(state.memoryTelemetry.status, "unavailable");
  assert.deepEqual(state.hardware, unavailableState().hardware);
});

test("rejects invalid IPC envelopes and arithmetic instead of rendering them", async () => {
  for (const response of [
    undefined,
    null,
    {},
    { ...snapshot, schemaVersion: 2 },
    { ...snapshot, collectedAt: "2026-02-30T12:00:00Z" },
    { ...snapshot, extra: true },
    ...[
      { totalBytes: 0 },
      { totalBytes: Number.MAX_SAFE_INTEGER + 1 },
      { availableBytes: -1 },
      { usedBytes: 1 },
      { usagePercent: NaN },
      { usagePercent: 100.1 },
      { usagePercent: "75" },
    ].map((patch) => ({
      ...snapshot,
      memory: { ...snapshot.memory, ...patch },
    })),
  ]) {
    const state = await collect(response);
    assert.equal(state.memoryTelemetry.status, "error");
    assert.equal(
      state.memoryTelemetry.message,
      "The native snapshot failed validation.",
    );
    assert.deepEqual(state.hardware, unavailableState().hardware);
  }
});

test("native and transport failures are unavailable without leaking raw errors", async () => {
  for (const error of [
    { code: "UNSUPPORTED_PLATFORM" },
    { code: "WINDOWS_API", win32Code: 5 },
    { code: "INVALID_MEMORY" },
    { code: "COLLECTION_TASK_FAILED" },
    { code: "toString" },
    "<script>private details</script>",
    new Error("private details"),
  ]) {
    const state = await collectMemoryState({
      isDesktop: () => true,
      invokeCommand: async () => {
        throw error;
      },
    });
    assert.equal(state.source, "unavailable");
    assert.equal(
      state.memoryTelemetry.status,
      error.code === "UNSUPPORTED_PLATFORM" ? "unavailable" : "error",
    );
    assert.doesNotMatch(
      state.memoryTelemetry.message,
      /private details|script|toString/,
    );
    assert.deepEqual(state.hardware, unavailableState().hardware);
  }
});

test("a hung IPC call times out and late completion cannot replace the error state", async () => {
  let finish;
  const request = new Promise((resolve) => {
    finish = resolve;
  });
  const state = await collectMemoryState({
    isDesktop: () => true,
    invokeCommand: () => request,
    timeoutMs: 5,
  });
  assert.equal(state.memoryTelemetry.status, "error");
  assert.match(state.memoryTelemetry.message, /timed out/);
  finish(snapshot);
  await request;
  assert.deepEqual(state.hardware, unavailableState().hardware);
});
