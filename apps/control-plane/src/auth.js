const roles = {
  reader: ["dashboard:read", "tenant:read", "plan:read"],
  operator: ["dashboard:read", "tenant:read", "plan:read", "marketplace:write", "billing:write"],
  admin: ["dashboard:read", "tenant:read", "plan:read", "marketplace:write", "billing:write", "tenant:revoke"]
};

function tokenFrom(request) {
  const value = request.headers.authorization ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : null;
}

export function authenticate(request) {
  const mode = process.env.AUTH_MODE ?? "demo";
  const token = tokenFrom(request);
  if (mode === "demo") {
    const identities = {
      "local-reader": { subject: "local-reader", role: "reader" },
      "local-operator": { subject: "local-operator", role: "operator" },
      "local-admin": { subject: "local-admin", role: "admin" }
    };
    return identities[token] ?? null;
  }

  // In deployed environments an OIDC-aware edge validates the JWT first.
  // Only an allowlisted reverse proxy may set these headers for the service.
  const subject = request.headers["x-verified-subject"];
  const role = request.headers["x-verified-role"];
  if (!subject || !roles[role]) return null;
  return { subject, role };
}

export function can(identity, permission) {
  return Boolean(identity && roles[identity.role]?.includes(permission));
}

export function rolePermissions(role) {
  return roles[role] ?? [];
}
