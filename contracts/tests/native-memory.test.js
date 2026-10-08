import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { systemSnapshotSchema } from "../dist/system-snapshot.js";

test("native memory serialization fixture satisfies the shared v1 contract", () => {
  const snapshot = JSON.parse(
    readFileSync(
      new URL("../fixtures/memory-snapshot.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(systemSnapshotSchema.parse(snapshot), snapshot);
});
