import test from "node:test";
import assert from "node:assert/strict";
import { getEnvironmentSummary } from "./index.js";

test("reports the local runtime environment", () => {
  const summary = getEnvironmentSummary();
  assert.match(summary.node, /^v\d+\./);
  assert.ok(summary.cpuCores > 0);
  assert.ok(summary.memoryGiB > 0);
});
