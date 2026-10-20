import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectMemoryState } from "../src/data/memory-ipc.js";
import { unavailableState, connectionLabel } from "../src/data/state.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../contracts/fixtures/process-snapshot.json", import.meta.url),
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

test("existing IPC maps processes without inferred hardware, findings, or actions", async () => {
  const state = await collect(snapshot);
  assert.deepEqual(state.processes, snapshot.processes);
  assert.equal(state.source, "native");
  assert.equal(connectionLabel(state), "Processes only");
  for (const key of [
    "hardware",
    "audit",
    "findings",
    "results",
    "restore",
    "impacts",
  ])
    assert.deepEqual(state[key], unavailableState()[key]);
});

test("legacy, unavailable and successful empty process lists remain distinct", async () => {
  for (const processes of [undefined, null]) {
    const state = await collect({ ...snapshot, processes });
    assert.equal(state.processes, undefined);
    assert.equal(state.source, "unavailable");
  }
  assert.deepEqual(
    (await collect({ ...snapshot, processes: [] })).processes,
    [],
  );
});

test("invalid process payloads and enumeration errors remain disconnected", async () => {
  const invalid = await collect({
    ...snapshot,
    processes: [{ ...snapshot.processes[0], workingSetBytes: -1 }],
  });
  assert.equal(invalid.memoryTelemetry.status, "error");
  assert.equal(invalid.processes, undefined);
  for (const code of ["PROCESS_WINDOWS_API", "INVALID_PROCESSES"]) {
    const state = await collectMemoryState({
      isDesktop: () => true,
      invokeCommand: async () => {
        throw { code, message: "private details" };
      },
    });
    assert.equal(state.memoryTelemetry.status, "error");
    assert.equal(state.processes, undefined);
    assert.deepEqual(state.hardware, unavailableState().hardware);
    assert.doesNotMatch(state.memoryTelemetry.message, /private/);
  }
});
