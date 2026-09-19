import { test } from "node:test";
import assert from "node:assert/strict";
import { unavailableState } from "../src/data/state.js";
import { escapeHtml } from "../src/ui.js";
test("disconnected telemetry never claims measurements or protection", () => {
  const state = unavailableState();
  assert.equal(state.source, "unavailable");
  assert.equal(state.restore, "Not verified");
  assert.ok(
    state.hardware.every(
      (metric) => metric.value === "—" && metric.percent === null,
    ),
  );
  assert.ok(state.impacts.every((value) => value === "—"));
});
test("dynamic text cannot create markup", () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
});
