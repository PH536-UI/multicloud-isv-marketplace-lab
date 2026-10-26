import { addAudit, suspendTenant, upsertTenant } from "./store.js";

function required(event, fields) {
  for (const field of fields) {
    if (!event[field]) throw new Error(`Missing required field: ${field}`);
  }
}

export function normalizeAwsEntitlement(event) {
  required(event, ["customerIdentifier", "productCode", "planId"]);
  return {
    provider: "aws",
    tenantId: `aws-${event.customerIdentifier}`,
    planId: event.planId,
    agreementId: event.customerAWSAccountId ?? event.customerIdentifier,
    source: "aws-marketplace-entitlement",
    marketplace: {
      productCode: event.productCode,
      customerIdentifier: event.customerIdentifier,
      customerAWSAccountId: event.customerAWSAccountId,
      licenseArn: event.licenseArn
    }
  };
}

export function normalizeOciAgreement(event) {
  required(event, ["subscriberId", "listingId", "planId"]);
  return {
    provider: "oci",
    tenantId: `oci-${event.subscriberId}`,
    planId: event.planId,
    agreementId: event.orderId ?? event.subscriberId,
    source: "oci-marketplace-agreement",
    marketplace: {
      listingId: event.listingId,
      marketplaceOfferId: event.marketplaceOfferId,
      subscriberId: event.subscriberId,
      customerTenancyId: event.customerTenancyId,
      billingIdentifier: event.billingIdentifier
    }
  };
}

export function provisionFromAws(event) {
  const normalized = normalizeAwsEntitlement(event);
  const tenant = upsertTenant(normalized);
  addAudit("marketplace.aws.entitlement.accepted", tenant.tenantId, { productCode: event.productCode });
  return tenant;
}

export function provisionFromOci(event) {
  const normalized = normalizeOciAgreement(event);
  const tenant = upsertTenant(normalized);
  addAudit("marketplace.oci.agreement.accepted", tenant.tenantId, { listingId: event.listingId });
  return tenant;
}

export function revokeEntitlement(provider, tenantId, reason = "marketplace-revocation") {
  const tenant = suspendTenant(tenantId, reason);
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);
  addAudit(`marketplace.${provider}.entitlement.revoked`, tenantId, { reason });
  return tenant;
}
