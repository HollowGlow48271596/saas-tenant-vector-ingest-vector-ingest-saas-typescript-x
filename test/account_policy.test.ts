import assert from "node:assert/strict";
import test from "node:test";
import { AccountCannotIngestError, requireIngestibleAccount } from "../src/account_policy.js";

test("active tenant accounts may ingest onboarding documents", () => {
  assert.doesNotThrow(() => requireIngestibleAccount("active"));
});

test("suspended and closed accounts are stopped before ingestion", () => {
  for (const status of ["suspended", "closed"] as const) {
    assert.throws(() => requireIngestibleAccount(status), (error) => {
      assert.ok(error instanceof AccountCannotIngestError);
      assert.equal(error.status, status);
      return true;
    });
  }
});
