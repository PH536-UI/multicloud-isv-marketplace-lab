import { addAudit, getTenant, recordUsage } from "./store.js";

function required(payload, fields) {
  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") throw new Error(`Missing required field: ${field}`);
  }
}

function positiveNumber(value, field) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${field} must be a positive number`);
}

function activeTenant(tenantId) {
  const tenant = getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);
  if (tenant.status !== "active") throw new Error(`Tenant is not active: ${tenantId}`);
  return tenant;
}

export function normalizeAwsUsage(payload) {
  required(payload, ["customerIdentifier", "dimension", "quantity", "timestamp"]);
  positiveNumber(payload.quantity, "quantity");
  return {
    provider: "aws",
    tenantId: `aws-${payload.customerIdentifier}`,
    usageKey: payload.usageKey ?? `aws:${payload.customerIdentifier}:${payload.dimension}:${payload.timestamp}`,
    dimension: payload.dimension,
    quantity: payload.quantity,
    timestamp: payload.timestamp,
    source: "aws-marketplace-metering",
    commercial: { productCode: payload.productCode, customerIdentifier: payload.customerIdentifier }
  };
}

export function normalizeOciUsage(payload) {
  required(payload, ["subscriberId", "metric", "quantity", "timestamp"]);
  positiveNumber(payload.quantity, "quantity");
  return {
    provider: "oci",
    tenantId: `oci-${payload.subscriberId}`,
    usageKey: payload.usageKey ?? `oci:${payload.subscriberId}:${payload.metric}:${payload.timestamp}`,
    dimension: payload.metric,
    quantity: payload.quantity,
    timestamp: payload.timestamp,
    source: "oci-marketplace-usage",
    commercial: {
      marketplaceOfferId: payload.marketplaceOfferId,
      amount: payload.amount,
      currencyCode: payload.currencyCode,
      usageStart: payload.usageStart,
      usageEnd: payload.usageEnd,
      customerTenancyId: payload.customerTenancyId,
      billingIdentifier: payload.billingIdentifier
    }
  };
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function acceptUsage(normalized) {
  const tenant = activeTenant(normalized.tenantId);
  const usage = recordUsage({
    ...normalized,
    commercial: { ...compact(tenant.marketplace ?? {}), ...compact(normalized.commercial ?? {}) }
  });
  if (!usage.duplicate) addAudit(`billing.${normalized.provider}.usage.accepted`, normalized.tenantId, { dimension: normalized.dimension, quantity: normalized.quantity, usageKey: normalized.usageKey });
  return usage;
}

export function submitAwsUsage(payload) { return acceptUsage(normalizeAwsUsage(payload)); }
export function submitOciUsage(payload) { return acceptUsage(normalizeOciUsage(payload)); }
