import test from "node:test";
import assert from "node:assert/strict";
import { submitAwsUsage, submitOciUsage } from "../src/billing.js";
import { ociUsageRecord, submitOciUsage as deliverOciUsage } from "../src/adapters.js";
import { provisionFromAws, provisionFromOci } from "../src/marketplace.js";
import { providerDashboard, resetStore } from "../src/store.js";

test.beforeEach(() => resetStore());

test("AWS usage is accepted once and deduplicated by usage key", () => {
  provisionFromAws({ customerIdentifier: "billing-customer", productCode: "product-demo", planId: "growth" });
  const payload = { customerIdentifier: "billing-customer", dimension: "requests", quantity: 42, timestamp: "2026-10-27T15:00:00Z", usageKey: "aws-usage-001" };
  const first = submitAwsUsage(payload);
  const retry = submitAwsUsage(payload);

  assert.equal(first.duplicate, false);
  assert.equal(retry.duplicate, true);
  assert.equal(providerDashboard("aws").usageByDimension.requests, 42);
});

test("OCI usage accepts metering after an agreement", () => {
  provisionFromOci({ subscriberId: "billing-subscriber", listingId: "listing-demo", planId: "enterprise" });
  const usage = submitOciUsage({ subscriberId: "billing-subscriber", metric: "active-users", quantity: 12, timestamp: "2026-10-27T15:00:00Z" });

  assert.equal(usage.provider, "oci");
  assert.equal(usage.duplicate, false);
  assert.equal(providerDashboard("oci").usageByDimension["active-users"], 12);
});

test("billing rejects usage for a missing tenant", () => {
  assert.throws(
    () => submitAwsUsage({ customerIdentifier: "unknown", dimension: "requests", quantity: 1, timestamp: "2026-10-27T15:00:00Z" }),
    /Tenant not found/
  );
});

test("OCI commercial adapter uses the Self Service partner endpoint and a stable retry token", async () => {
  const usage = {
    provider: "oci",
    usageKey: "oci usage/001",
    dimension: "active-users",
    quantity: 12,
    timestamp: "2026-10-27T15:00:00Z",
    commercial: {
      marketplaceOfferId: "ocid1.marketplaceoffer.oc1..example",
      amount: 4.5,
      currencyCode: "USD",
      usageStart: "2026-10-27T14:00:00Z",
      usageEnd: "2026-10-27T15:00:00Z",
      customerTenancyId: "ocid1.tenancy.oc1..customer"
    }
  };
  const calls = [];
  const client = {
    async submitSubscriptionUsageRecords(request) {
      calls.push(request);
      return { opcRequestId: "oci-request-123" };
    }
  };

  const record = ociUsageRecord(usage);
  assert.ok(record.timeUsageStarted instanceof Date);
  assert.ok(record.timeUsageEnded instanceof Date);

  const receipt = await deliverOciUsage(usage, {
    client,
    compartmentId: "ocid1.compartment.oc1..partner"
  });

  assert.deepEqual(receipt, { provider: "oci", recordId: "oci usage/001", requestId: "oci-request-123" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].compartmentId, "ocid1.compartment.oc1..partner");
  assert.equal(calls[0].opcRetryToken, "oci usage/001");
  assert.equal(calls[0].opcRequestId, "usage-oci-usage-001");
  assert.equal(calls[0].submitSubscriptionUsageRecordsDetails.subscriptionUsageRecords[0].marketplaceOfferId, "ocid1.marketplaceoffer.oc1..example");
});
