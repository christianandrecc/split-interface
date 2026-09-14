function jwtPayload(value) {
  try {
    return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString());
  } catch {
    return null;
  }
}

// This validates configuration, not JWT authenticity. Never print credentials.
export function validateDeploymentEnv(env) {
  const issues = [];
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  let url;
  try {
    url = new URL(rawUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      issues.push("VITE_SUPABASE_URL must be a clean HTTPS project origin.");
    }
  } catch {
    issues.push("VITE_SUPABASE_URL is missing or invalid.");
  }

  const projectRef = url?.hostname.endsWith(".supabase.co")
    ? url.hostname.split(".")[0]
    : null;
  const configuredRef = env.VITE_SUPABASE_PROJECT_ID?.trim();
  if (projectRef && configuredRef && projectRef !== configuredRef) {
    issues.push("VITE_SUPABASE_PROJECT_ID does not match VITE_SUPABASE_URL.");
  }

  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
  const payload = jwtPayload(key);
  if (!/^sb_publishable_\S+$/.test(key) && payload?.role !== "anon") {
    issues.push(
      "VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable key or legacy anon key, never a secret/service-role key.",
    );
  }
  if (projectRef && payload?.ref && projectRef !== payload.ref) {
    issues.push(
      "The Supabase URL and legacy public key belong to different projects.",
    );
  }

  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("VITE_") || !value) continue;
    if (
      /SECRET|SERVICE_ROLE|PRIVATE_KEY/i.test(name) ||
      /SENTRY.*TOKEN|TOKEN.*SENTRY/i.test(name) ||
      value.startsWith("sntrys_") ||
      value.startsWith("sb_secret_") ||
      jwtPayload(value)?.role === "service_role"
    ) {
      issues.push(
        `Remove ${name}: privileged secrets must never be exposed to the browser.`,
      );
    }
  }

  for (const name of [
    "VITE_SUPABASE_AUTH_REDIRECT_URL",
    "VITE_PUBLIC_APP_URL",
    "VITE_APP_URL",
  ]) {
    if (!env[name]?.trim()) continue;
    try {
      const redirect = new URL(env[name]);
      if (
        redirect.protocol !== "https:" ||
        redirect.username ||
        redirect.password ||
        redirect.hash ||
        redirect.search ||
        redirect.pathname !== "/"
      ) {
        throw new Error("Invalid deployed redirect");
      }
    } catch {
      issues.push(
        `${name} must be the deployed HTTPS app origin, without query parameters or a fragment.`,
      );
    }
  }
  const sentryEnabled = env.VITE_SENTRY_ENABLED?.trim();
  if (sentryEnabled && sentryEnabled !== "true" && sentryEnabled !== "false") {
    issues.push("VITE_SENTRY_ENABLED must be true or false.");
  }
  if (sentryEnabled === "true" || env.VITE_SENTRY_DSN?.trim()) {
    try {
      const dsn = new URL(env.VITE_SENTRY_DSN);
      if (dsn.protocol !== "https:" || !/^o\d+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(dsn.hostname)
        || !/^[a-f0-9]{32}$/.test(dsn.username) || !/^\/\d+$/.test(dsn.pathname)
        || dsn.password || dsn.port || dsn.search || dsn.hash) throw new Error("Invalid DSN");
    } catch {
      issues.push("VITE_SENTRY_DSN must be a Sentry cloud project DSN, not an API token or dashboard URL.");
    }
  }
  if (sentryEnabled === "true" && !["production", "preview", "development"].includes(env.VITE_SENTRY_ENVIRONMENT)) {
    issues.push("Set VITE_SENTRY_ENVIRONMENT to production, preview, or development before enabling reports.");
  }
  return issues;
}
