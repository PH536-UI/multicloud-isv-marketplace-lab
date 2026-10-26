import http from "node:http";
import { URL } from "node:url";
import { authenticate, can } from "./auth.js";
import { submitAwsUsage, submitOciUsage } from "./billing.js";
import { dashboard, getTenant, listOutbox, listPlans, listTenants, providerDashboard, usageForTenant } from "./store.js";
import { processOutbox, startOutboxProcessor } from "./outbox.js";
import { provisionFromAws, provisionFromOci, revokeEntitlement } from "./marketplace.js";

const port = Number(process.env.PORT ?? 8080);
const audience = process.env.CONTROL_PLANE_AUDIENCE ?? "local-lab";

function json(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}

function authorize(request, response, permission) {
  const identity = authenticate(request);
  if (!identity) {
    json(response, 401, { error: "unauthenticated", message: "Provide a verified identity." });
    return null;
  }
  if (!can(identity, permission)) {
    json(response, 403, { error: "forbidden", message: `Missing permission: ${permission}` });
    return null;
  }
  return identity;
}

export function createServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    try {
      if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { status: "ok", service: "control-plane", audience });
      if (request.method === "GET" && url.pathname === "/v1/plans") {
        if (!authorize(request, response, "plan:read")) return;
        return json(response, 200, { plans: listPlans() });
      }
      if (request.method === "GET" && url.pathname === "/v1/tenants") {
        if (!authorize(request, response, "tenant:read")) return;
        return json(response, 200, { tenants: listTenants() });
      }
      if (request.method === "GET" && url.pathname === "/v1/dashboard") {
        if (!authorize(request, response, "dashboard:read")) return;
        return json(response, 200, dashboard());
      }
      if (request.method === "GET" && url.pathname === "/v1/outbox") {
        if (!authorize(request, response, "dashboard:read")) return;
        return json(response, 200, { items: listOutbox(url.searchParams.get("status") ?? undefined) });
      }
      if (request.method === "POST" && url.pathname === "/v1/outbox/process") {
        if (!authorize(request, response, "billing:write")) return;
        const payload = await body(request);
        return json(response, 200, await processOutbox({ limit: payload.limit, deliveryMode: payload.deliveryMode }));
      }

      const dashboardMatch = url.pathname.match(/^\/v1\/dashboards\/(aws|oci)$/);
      if (request.method === "GET" && dashboardMatch) {
        if (!authorize(request, response, "dashboard:read")) return;
        return json(response, 200, providerDashboard(dashboardMatch[1]));
      }

      const tenantMatch = url.pathname.match(/^\/v1\/tenants\/([^/]+)$/);
      if (request.method === "GET" && tenantMatch) {
        if (!authorize(request, response, "tenant:read")) return;
        const tenant = getTenant(decodeURIComponent(tenantMatch[1]));
        return tenant ? json(response, 200, tenant) : json(response, 404, { error: "tenant_not_found" });
      }

      const usageMatch = url.pathname.match(/^\/v1\/tenants\/([^/]+)\/usage$/);
      if (request.method === "GET" && usageMatch) {
        if (!authorize(request, response, "tenant:read")) return;
        const tenantId = decodeURIComponent(usageMatch[1]);
        if (!getTenant(tenantId)) return json(response, 404, { error: "tenant_not_found" });
        return json(response, 200, { tenantId, usage: usageForTenant(tenantId) });
      }

      if (request.method === "POST" && url.pathname === "/v1/marketplace/aws/entitlements") {
        if (!authorize(request, response, "marketplace:write")) return;
        return json(response, 201, provisionFromAws(await body(request)));
      }
      if (request.method === "POST" && url.pathname === "/v1/marketplace/oci/agreements") {
        if (!authorize(request, response, "marketplace:write")) return;
        return json(response, 201, provisionFromOci(await body(request)));
      }
      if (request.method === "POST" && url.pathname === "/v1/billing/aws/usage") {
        if (!authorize(request, response, "billing:write")) return;
        return json(response, 202, submitAwsUsage(await body(request)));
      }
      if (request.method === "POST" && url.pathname === "/v1/billing/oci/usage") {
        if (!authorize(request, response, "billing:write")) return;
        return json(response, 202, submitOciUsage(await body(request)));
      }

      const revokeMatch = url.pathname.match(/^\/v1\/marketplace\/(aws|oci)\/tenants\/([^/]+)\/revoke$/);
      if (request.method === "POST" && revokeMatch) {
        if (!authorize(request, response, "tenant:revoke")) return;
        const payload = await body(request);
        return json(response, 200, revokeEntitlement(revokeMatch[1], decodeURIComponent(revokeMatch[2]), payload.reason));
      }
      return json(response, 404, { error: "route_not_found" });
    } catch (error) {
      return json(response, 400, { error: "invalid_request", message: error.message });
    }
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const stopOutboxProcessor = startOutboxProcessor();
  const server = createServer().listen(port, () => console.log(`control-plane listening on :${port}`));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      stopOutboxProcessor();
      server.close(() => process.exit(0));
    });
  }
}
