import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const plans = new Map([
  ["starter", { id: "starter", name: "Starter", monthlyLimit: 1000, features: ["api", "basic-support"] }],
  ["growth", { id: "growth", name: "Growth", monthlyLimit: 10000, features: ["api", "audit", "priority-support"] }],
  ["enterprise", { id: "enterprise", name: "Enterprise", monthlyLimit: 100000, features: ["api", "audit", "sso", "custom-limits"] }]
]);

const stateFile = process.env.STATE_FILE ?? "./data/control-plane-state.json";
const stateDirectory = dirname(stateFile);
let auditSequence = 0;
const tenants = new Map();
const auditEvents = [];
const usageEvents = new Map();
const outboxEvents = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hydrate() {
  if (!existsSync(stateFile)) return;
  let saved;
  try {
    saved = JSON.parse(readFileSync(stateFile, "utf8"));
  } catch (error) {
    throw new Error(`Unable to load state file ${stateFile}: ${error.message}`);
  }
  for (const tenant of saved.tenants ?? []) tenants.set(tenant.tenantId, tenant);
  for (const event of saved.auditEvents ?? []) auditEvents.push(event);
  for (const usage of saved.usageEvents ?? []) usageEvents.set(usage.usageKey, usage);
  for (const outbox of saved.outboxEvents ?? []) {
    // A process may stop after claiming an item. Make it eligible again at boot.
    if (outbox.status === "processing") {
      outbox.status = "retry";
      outbox.nextAttemptAt = new Date().toISOString();
      outbox.updatedAt = outbox.nextAttemptAt;
    }
    outboxEvents.set(outbox.id, outbox);
  }
  auditSequence = Number(saved.auditSequence ?? auditEvents.length);
}

function persist() {
  mkdirSync(stateDirectory, { recursive: true });
  const temporaryFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
  const content = JSON.stringify({
    version: 1,
    auditSequence,
    tenants: [...tenants.values()],
    auditEvents,
    usageEvents: [...usageEvents.values()],
    outboxEvents: [...outboxEvents.values()]
  }, null, 2);
  writeFileSync(temporaryFile, content, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryFile, stateFile);
}

hydrate();

export function listPlans() { return [...plans.values()]; }
export function getPlan(planId) { return plans.get(planId); }
export function getTenant(tenantId) { return tenants.get(tenantId); }
export function listTenants() { return [...tenants.values()].sort((a, b) => a.tenantId.localeCompare(b.tenantId)); }

export function upsertTenant({ tenantId, planId, provider, agreementId, source, marketplace = {} }) {
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const current = tenants.get(tenantId);
  const tenant = {
    tenantId, planId, provider, agreementId, status: "active",
    entitlement: { planId, monthlyLimit: plan.monthlyLimit, features: plan.features },
    marketplace: { ...current?.marketplace, ...marketplace },
    createdAt: current?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(), source
  };
  tenants.set(tenantId, tenant);
  addAudit("tenant.provisioned", tenantId, { provider, planId, agreementId, source });
  persist();
  return clone(tenant);
}

export function suspendTenant(tenantId, reason) {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.status = "suspended";
  tenant.updatedAt = new Date().toISOString();
  addAudit("tenant.suspended", tenantId, { reason });
  persist();
  return clone(tenant);
}

export function recordUsage({ usageKey, provider, tenantId, dimension, quantity, timestamp, source, commercial = {} }) {
  const existing = usageEvents.get(usageKey);
  if (existing) return { ...clone(existing), duplicate: true };
  const acceptedAt = new Date().toISOString();
  const usage = { usageKey, provider, tenantId, dimension, quantity, timestamp, source, commercial, acceptedAt, delivery: "pending" };
  const outbox = {
    id: `usage:${usageKey}`, type: "marketplace.usage.submit", provider, usageKey, tenantId,
    status: "pending", attempts: 0, nextAttemptAt: acceptedAt, createdAt: acceptedAt, updatedAt: acceptedAt
  };
  usageEvents.set(usageKey, usage);
  outboxEvents.set(outbox.id, outbox);
  persist();
  return { ...clone(usage), duplicate: false };
}

export function usageForTenant(tenantId) {
  return [...usageEvents.values()].filter((usage) => usage.tenantId === tenantId).map(clone);
}

export function getUsage(usageKey) { return usageEvents.get(usageKey) ? clone(usageEvents.get(usageKey)) : null; }

export function claimOutbox(limit = 25, now = new Date().toISOString()) {
  const items = [...outboxEvents.values()]
    .filter((item) => ["pending", "retry"].includes(item.status) && item.nextAttemptAt <= now)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
  for (const item of items) {
    item.status = "processing";
    item.attempts += 1;
    item.updatedAt = now;
  }
  if (items.length) persist();
  return items.map(clone);
}

export function markOutboxDelivered(id, receipt = {}) {
  const item = outboxEvents.get(id);
  if (!item) throw new Error(`Outbox item not found: ${id}`);
  const at = new Date().toISOString();
  item.status = "delivered";
  item.receipt = receipt;
  item.deliveredAt = at;
  item.updatedAt = at;
  const usage = usageEvents.get(item.usageKey);
  if (usage) usage.delivery = "delivered";
  addAudit(`billing.${item.provider}.usage.delivered`, item.tenantId, { usageKey: item.usageKey, receipt });
  persist();
  return clone(item);
}

export function markOutboxRetry(id, error, retryAfterSeconds = 60, now = new Date().toISOString()) {
  const item = outboxEvents.get(id);
  if (!item) throw new Error(`Outbox item not found: ${id}`);
  const attemptAt = new Date(now);
  if (Number.isNaN(attemptAt.valueOf())) throw new Error("Invalid retry timestamp");
  const nextAttemptAt = new Date(attemptAt.valueOf() + retryAfterSeconds * 1000).toISOString();
  item.status = "retry";
  item.lastError = String(error).slice(0, 500);
  item.nextAttemptAt = nextAttemptAt;
  item.updatedAt = attemptAt.toISOString();
  const usage = usageEvents.get(item.usageKey);
  if (usage) usage.delivery = "retry";
  addAudit(`billing.${item.provider}.usage.retry_scheduled`, item.tenantId, { usageKey: item.usageKey, nextAttemptAt });
  persist();
  return clone(item);
}

export function listOutbox(status) {
  return [...outboxEvents.values()].filter((item) => !status || item.status === status).map(clone);
}

export function addAudit(type, tenantId, data = {}) {
  const event = { id: `evt_${++auditSequence}`, type, tenantId, data, at: new Date().toISOString() };
  auditEvents.unshift(event);
  return clone(event);
}

export function recentAuditEvents(limit = 20) { return auditEvents.slice(0, limit).map(clone); }

export function dashboard() {
  const all = listTenants();
  const outbox = listOutbox();
  return {
    tenants: all.length, activeTenants: all.filter((tenant) => tenant.status === "active").length,
    byProvider: { aws: all.filter((tenant) => tenant.provider === "aws").length, oci: all.filter((tenant) => tenant.provider === "oci").length },
    acceptedUsageEvents: usageEvents.size,
    outbox: { pending: outbox.filter((item) => ["pending", "retry", "processing"].includes(item.status)).length, delivered: outbox.filter((item) => item.status === "delivered").length },
    recentEvents: recentAuditEvents(10)
  };
}

export function providerDashboard(provider) {
  const all = listTenants().filter((tenant) => tenant.provider === provider);
  const usage = [...usageEvents.values()].filter((event) => event.provider === provider);
  const outbox = listOutbox().filter((item) => item.provider === provider);
  return {
    provider, tenants: all.length, activeTenants: all.filter((tenant) => tenant.status === "active").length,
    suspendedTenants: all.filter((tenant) => tenant.status === "suspended").length, acceptedUsageEvents: usage.length,
    outbox: { pending: outbox.filter((item) => ["pending", "retry", "processing"].includes(item.status)).length, delivered: outbox.filter((item) => item.status === "delivered").length },
    usageByDimension: usage.reduce((result, event) => ({ ...result, [event.dimension]: (result[event.dimension] ?? 0) + event.quantity }), {}),
    plans: Object.fromEntries([...new Set(all.map((tenant) => tenant.planId))].sort().map((planId) => [planId, all.filter((tenant) => tenant.planId === planId).length])),
    recentEvents: recentAuditEvents(20).filter((event) => event.data.provider === provider || event.type.includes(`.${provider}.`))
  };
}

export function resetStore() {
  tenants.clear(); auditEvents.length = 0; usageEvents.clear(); outboxEvents.clear(); auditSequence = 0; persist();
}
