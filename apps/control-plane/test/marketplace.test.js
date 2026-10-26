import test from "node:test";
import assert from "node:assert/strict";
import { provisionFromAws, provisionFromOci, revokeEntitlement } from "../src/marketplace.js";
import { getTenant, providerDashboard, resetStore } from "../src/store.js";

test.beforeEach(() => resetStore());

test("AWS entitlement provisions an active portable tenant", () => {
  const tenant = provisionFromAws({
    customerIdentifier: "customer-123",
    customerAWSAccountId: "123456789012",
    productCode: "product-demo",
    planId: "growth"
  });

  assert.equal(tenant.tenantId, "aws-customer-123");
  assert.equal(tenant.provider, "aws");
  assert.equal(tenant.entitlement.monthlyLimit, 10000);
  assert.equal(getTenant("aws-customer-123").status, "active");
});

test("OCI agreement provisions a tenant and updates its mirrored dashboard", () => {
  provisionFromOci({
    subscriberId: "subscriber-456",
    orderId: "order-001",
    listingId: "listing-demo",
    planId: "enterprise"
  });

  const dashboard = providerDashboard("oci");
  assert.equal(dashboard.tenants, 1);
  assert.equal(dashboard.activeTenants, 1);
  assert.equal(dashboard.plans.enterprise, 1);
});

test("revocation suspends access instead of removing tenant history", () => {
  provisionFromAws({ customerIdentifier: "customer-789", productCode: "product-demo", planId: "starter" });
  const suspended = revokeEntitlement("aws", "aws-customer-789", "subscription-ended");

  assert.equal(suspended.status, "suspended");
  assert.equal(getTenant("aws-customer-789").tenantId, "aws-customer-789");
});
