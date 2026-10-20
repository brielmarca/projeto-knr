import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectMemoryState } from "../src/data/memory-ipc.js";
import { unavailableState, connectionLabel } from "../src/data/state.js";
import { hardwareMetric } from "../src/components/hardware.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../contracts/fixtures/gpu-snapshot.json", import.meta.url),
    "utf8",
  ),
);
const collect = (response) =>
  collectMemoryState({
    isDesktop: () => true,
    invokeCommand: async () => response,
  });

test("multiple GPUs retain individual capacities without inventing usage or diagnostics", async () => {
  const state = await collect(snapshot);
  assert.deepEqual(state.gpus, snapshot.gpus);
  assert.equal(connectionLabel(state), "GPU only");
  assert.equal(state.hardware[1].name, "2 hardware adapters");
  assert.equal(state.hardware[1].percent, null);
  assert.equal(state.hardware[1].value, "—");
  for (const key of ["audit", "findings", "results", "restore", "impacts"])
    assert.deepEqual(state[key], unavailableState()[key]);
  const html = hardwareMetric(state.hardware[1], false);
  assert.match(html, /GPU snapshot/);
  assert.match(html, /hidden/);
  assert.doesNotMatch(html, /Not connected/);
});

test("single GPU capacity and unknown VRAM stay distinct from utilization", async () => {
  for (const gpu of snapshot.gpus) {
    const state = await collect({ ...snapshot, gpus: [gpu] });
    assert.equal(state.hardware[1].name, gpu.name);
    assert.equal(
      state.hardware[1].value,
      gpu.vramBytes === null ? "—" : "12.0 GiB VRAM",
    );
    assert.equal(state.hardware[1].percent, null);
  }
});

test("legacy and unavailable GPUs differ from a successful empty enumeration", async () => {
  const measured = JSON.parse(
    readFileSync(
      new URL("../contracts/fixtures/system-snapshot.json", import.meta.url),
      "utf8",
    ),
  );
  for (const gpus of [undefined, null]) {
    const state = await collect({ ...measured, gpus });
    assert.equal(state.gpus, undefined);
    assert.equal(connectionLabel(state), "CPU + Memory + Storage");
    assert.deepEqual(state.hardware[1], unavailableState().hardware[1]);
  }
  const empty = await collect({ ...snapshot, gpus: [] });
  assert.deepEqual(empty.gpus, []);
  assert.equal(empty.hardware[1].name, "No hardware adapters reported");
});

test("invalid GPU snapshots and native failures stay disconnected and sanitized", async () => {
  const invalid = await collect({
    ...snapshot,
    gpus: [{ ...snapshot.gpus[0], vramBytes: -1 }],
  });
  assert.equal(invalid.memoryTelemetry.status, "error");
  assert.deepEqual(invalid.hardware, unavailableState().hardware);
  for (const code of ["GPU_API", "INVALID_GPU"]) {
    const state = await collectMemoryState({
      isDesktop: () => true,
      invokeCommand: async () => {
        throw { code, message: "private details", hresult: -1 };
      },
    });
    assert.equal(state.memoryTelemetry.status, "error");
    assert.deepEqual(state.hardware, unavailableState().hardware);
    assert.doesNotMatch(state.memoryTelemetry.message, /private/);
  }
});
