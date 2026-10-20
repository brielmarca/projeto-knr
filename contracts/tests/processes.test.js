import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  systemSnapshotSchema,
  MAX_PROCESSES,
} from "../dist/system-snapshot.js";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../fixtures/process-snapshot.json", import.meta.url),
    "utf8",
  ),
);
const valid = (processes) =>
  systemSnapshotSchema.safeParse({ ...snapshot, processes }).success;

test("process contract preserves large working sets, zero, legacy and unavailable lists", () => {
  assert.deepEqual(systemSnapshotSchema.parse(snapshot), snapshot);
  for (const processes of [undefined, null, []])
    assert.equal(valid(processes), true);
  assert.equal(
    valid(
      Array.from({ length: MAX_PROCESSES }, (_, index) => ({
        pid: index + 1,
        name: "test.exe",
        workingSetBytes: 0,
      })),
    ),
    true,
  );
});

test("process contract rejects malformed, duplicate, unordered and unbounded lists", () => {
  const process = snapshot.processes[0];
  for (const patch of [
    { pid: 0 },
    { pid: -1 },
    { pid: 1.5 },
    { pid: 2 ** 32 },
    { name: "" },
    { name: " " },
    { name: "x".repeat(261) },
    { name: "C:\\test.exe" },
    { name: "bad\0name" },
    { name: "bad\nname" },
    { workingSetBytes: -1 },
    { workingSetBytes: 0.5 },
    { workingSetBytes: Number.MAX_SAFE_INTEGER + 1 },
    { workingSetBytes: null },
    { unexpected: true },
  ])
    assert.equal(
      valid([{ ...process, ...patch }]),
      false,
      JSON.stringify(patch),
    );
  assert.equal(valid([process, process]), false);
  assert.equal(valid([...snapshot.processes].reverse()), false);
  assert.equal(valid([snapshot.processes[2], snapshot.processes[1]]), false);
  assert.equal(
    valid(
      Array.from({ length: MAX_PROCESSES + 1 }, (_, index) => ({
        ...process,
        pid: index + 1,
      })),
    ),
    false,
  );
});
