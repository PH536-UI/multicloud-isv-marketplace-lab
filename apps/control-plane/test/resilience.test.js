import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const storeUrl = pathToFileURL(join(packageRoot, "src/store.js")).href;
const outboxUrl = pathToFileURL(join(packageRoot, "src/outbox.js")).href;

function createSandbox() {
  const directory = mkdtempSync(join(tmpdir(), "control-plane-resilience-"));
  return { directory, stateFile: join(directory, "state.json") };
}

function runIsolated(script, stateFile) {
  const stdout = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: packageRoot,
    env: { ...process.env, STATE_FILE: stateFile, MARKETPLACE_DELIVERY_MODE: "record" },
    encoding: "utf8"
  });
  return JSON.parse(stdout);
}

function cleanup(directory) {
  rmSync(directory, { recursive: true, force: true });
}

test("state persists tenants, usage and pending outbox records across a clean process restart", () => {
  const { directory, stateFile } = createSandbox();
  try {
    runIsolated(`
      import { upsertTenant, recordUsage } from ${JSON.stringify(storeUrl)};
      upsertTenant({ tenantId: "tenant-persist", planId: "growth", provider: "aws", agreementId: "agreement-1", source: "test" });
      recordUsage({ usageKey: "usage-persist", provider: "aws", tenantId: "tenant-persist", dimension: "requests", quantity: 7, timestamp: "2026-10-27T15:00:00.000Z", source: "test" });
      console.log(JSON.stringify({ written: true }));
    `, stateFile);

    const restored = runIsolated(`
      import { getTenant, getUsage, listOutbox, recentAuditEvents } from ${JSON.stringify(storeUrl)};
      console.log(JSON.stringify({ tenant: getTenant("tenant-persist"), usage: getUsage("usage-persist"), outbox: listOutbox(), audit: recentAuditEvents() }));
    `, stateFile);

    assert.equal(restored.tenant.status, "active");
    assert.equal(restored.tenant.entitlement.monthlyLimit, 10000);
    assert.equal(restored.usage.quantity, 7);
    assert.equal(restored.usage.delivery, "pending");
    assert.equal(restored.outbox.length, 1);
    assert.equal(restored.outbox[0].status, "pending");
    assert.equal(restored.audit[0].type, "tenant.provisioned");
  } finally {
    cleanup(directory);
  }
});

test("a processing record is recovered as retryable after a process restart", () => {
  const { directory, stateFile } = createSandbox();
  try {
    runIsolated(`
      import { upsertTenant, recordUsage, claimOutbox } from ${JSON.stringify(storeUrl)};
      upsertTenant({ tenantId: "tenant-recovery", planId: "starter", provider: "oci", agreementId: "agreement-2", source: "test" });
      recordUsage({ usageKey: "usage-recovery", provider: "oci", tenantId: "tenant-recovery", dimension: "active-users", quantity: 2, timestamp: "2026-10-27T15:00:00.000Z", source: "test" });
      console.log(JSON.stringify(claimOutbox()));
    `, stateFile);

    const restored = runIsolated(`
      import { listOutbox, claimOutbox } from ${JSON.stringify(storeUrl)};
      const beforeClaim = listOutbox();
      const claimedAgain = claimOutbox(1, "2099-01-01T00:00:00.000Z");
      console.log(JSON.stringify({ beforeClaim, claimedAgain }));
    `, stateFile);

    assert.equal(restored.beforeClaim[0].status, "retry");
    assert.equal(restored.beforeClaim[0].attempts, 1);
    assert.equal(restored.claimedAgain.length, 1);
    assert.equal(restored.claimedAgain[0].attempts, 2);
  } finally {
    cleanup(directory);
  }
});

test("outbox applies exponential backoff after each failed delivery", () => {
  const { directory, stateFile } = createSandbox();
  try {
    const result = runIsolated(`
      import { upsertTenant, recordUsage, listOutbox } from ${JSON.stringify(storeUrl)};
      import { processOutbox } from ${JSON.stringify(outboxUrl)};
      upsertTenant({ tenantId: "tenant-retry", planId: "enterprise", provider: "aws", agreementId: "agreement-3", source: "test" });
      recordUsage({ usageKey: "usage-retry", provider: "aws", tenantId: "tenant-retry", dimension: "requests", quantity: 5, timestamp: "2026-10-27T15:00:00.000Z", source: "test" });
      const firstFailure = await processOutbox({ deliveryMode: "record", now: "2099-01-01T00:00:00.000Z", deliver: async () => { throw new Error("first temporary error"); } });
      const firstRetry = listOutbox()[0];
      const secondFailure = await processOutbox({ deliveryMode: "record", now: firstRetry.nextAttemptAt, deliver: async () => { throw new Error("second temporary error"); } });
      const secondRetry = listOutbox()[0];
      console.log(JSON.stringify({ firstFailure, secondFailure, firstRetry, secondRetry }));
    `, stateFile);

    assert.deepEqual(result.firstFailure, { claimed: 1, delivered: 0, retried: 1 });
    assert.deepEqual(result.secondFailure, { claimed: 1, delivered: 0, retried: 1 });
    assert.equal(result.firstRetry.status, "retry");
    assert.equal(result.firstRetry.attempts, 1);
    assert.match(result.firstRetry.lastError, /first temporary error/);
    assert.equal(new Date(result.firstRetry.nextAttemptAt).valueOf() - new Date(result.firstRetry.updatedAt).valueOf(), 30_000);
    assert.equal(result.secondRetry.status, "retry");
    assert.equal(result.secondRetry.attempts, 2);
    assert.equal(new Date(result.secondRetry.nextAttemptAt).valueOf() - new Date(result.secondRetry.updatedAt).valueOf(), 60_000);
  } finally {
    cleanup(directory);
  }
});

test("a due retry is delivered exactly once and records its receipt", () => {
  const { directory, stateFile } = createSandbox();
  try {
    const delivered = runIsolated(`
      import { upsertTenant, recordUsage, claimOutbox, markOutboxRetry, getUsage, listOutbox } from ${JSON.stringify(storeUrl)};
      import { processOutbox } from ${JSON.stringify(outboxUrl)};
      upsertTenant({ tenantId: "tenant-delivery", planId: "growth", provider: "aws", agreementId: "agreement-4", source: "test" });
      recordUsage({ usageKey: "usage-delivery", provider: "aws", tenantId: "tenant-delivery", dimension: "requests", quantity: 9, timestamp: "2026-10-27T15:00:00.000Z", source: "test" });
      const [claimed] = claimOutbox();
      markOutboxRetry(claimed.id, "temporary delivery error", -1);
      const processed = await processOutbox({ deliveryMode: "record" });
      console.log(JSON.stringify({ processed, outbox: listOutbox()[0], usage: getUsage("usage-delivery") }));
    `, stateFile);

    assert.deepEqual(delivered.processed, { claimed: 1, delivered: 1, retried: 0 });
    assert.equal(delivered.outbox.status, "delivered");
    assert.equal(delivered.outbox.attempts, 2);
    assert.equal(delivered.outbox.receipt.mode, "record");
    assert.equal(delivered.usage.delivery, "delivered");
  } finally {
    cleanup(directory);
  }
});
