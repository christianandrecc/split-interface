import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, isDeepStrictEqual } from "node:util";
import { randomUUID } from "node:crypto";
import { getTemplatePatch, logoUrl, projectRef } from "./auth-email-templates.mjs";

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const allowedKeys = Object.keys(getTemplatePatch()).sort();
const protectedKeys = [
  "site_url", "uri_allow_list", "disable_signup", "mailer_autoconfirm",
  "mailer_secure_email_change_enabled", "mailer_allow_unverified_email_sign_ins",
  "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_admin_email", "smtp_sender_name",
  "smtp_max_frequency", "rate_limit_email_sent", "mailer_otp_exp", "hook_send_email_enabled",
];

export function validatePatch(patch) {
  if (!patch || !isDeepStrictEqual(Object.keys(patch).sort(), allowedKeys)
    || Object.values(patch).some((value) => typeof value !== "string")) {
    throw new Error("Only the three Auth email subjects and HTML templates may be updated.");
  }
}

// Never log Management API response bodies: Auth config may include SMTP secrets.
export async function publishTemplates({ token, apply = false, patch = getTemplatePatch(), fetchImpl = fetch, saveBackup }) {
  if (!token?.trim()) throw new Error("The temporary Supabase access token is missing. Add it to .env.email-templates.local, not chat.");
  validatePatch(patch);
  async function request(method, body) {
    const response = await fetchImpl(endpoint, {
      method,
      headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Supabase Auth configuration ${method} failed (HTTP ${response.status}). No response body was logged.`);
    return method === "GET" ? response.json() : undefined;
  }

  const before = await request("GET");
  if (before.mailer_autoconfirm !== false || before.mailer_secure_email_change_enabled !== true) {
    throw new Error("Email confirmation and secure email change must remain enabled. No security settings were changed.");
  }
  if (before.hook_send_email_enabled === true) throw new Error("An email hook is enabled; review it before changing the SMTP templates.");
  const changedKeys = allowedKeys.filter((key) => before[key] !== patch[key]);
  if (!apply || changedKeys.length === 0) return { status: changedKeys.length ? "ready" : "already-current", changedKeys };
  if (typeof saveBackup !== "function") throw new Error("A template backup is required before publishing.");

  const previousTemplates = Object.fromEntries(allowedKeys.map((key) => [key, before[key]]));
  validatePatch(previousTemplates);
  await saveBackup({ projectRef, savedAt: new Date().toISOString(), templates: previousTemplates });
  await request("PATCH", patch);
  const after = await request("GET");
  if (allowedKeys.some((key) => after[key] !== patch[key])) {
    throw new Error("Supabase did not return all saved templates. Inspect the configuration before retrying; a backup was created.");
  }
  if (protectedKeys.some((key) => !isDeepStrictEqual(before[key], after[key]))) {
    throw new Error("Auth/SMTP settings changed during publication. Inspect concurrent changes; the publisher sent only template fields.");
  }
  return { status: "published-and-verified", changedKeys };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply" && !arg.startsWith("--restore="))) {
    throw new Error("Usage: node scripts/publish-auth-emails.mjs [--apply] [--restore=/absolute/backup.json]");
  }
  const apply = args.includes("--apply");
  const tokenFile = new URL("../.env.email-templates.local", import.meta.url);
  let token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    const info = await stat(tokenFile);
    if ((info.mode & 0o077) !== 0) throw new Error("Token file must be private: chmod 600 .env.email-templates.local");
    token = parseEnv(await readFile(tokenFile, "utf8")).SUPABASE_ACCESS_TOKEN;
  }
  const restore = args.find((arg) => arg.startsWith("--restore="));
  let patch = getTemplatePatch();
  if (restore) {
    const backup = JSON.parse(await readFile(restore.slice("--restore=".length), "utf8"));
    if (backup.projectRef !== projectRef) throw new Error("This backup belongs to a different project.");
    patch = backup.templates;
  }
  if (apply && !restore) {
    const response = await fetch(logoUrl, { redirect: "error", signal: AbortSignal.timeout(15000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    const expected = await readFile(new URL("../public/split-android-chrome-512x512.png", import.meta.url));
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png") || !bytes.equals(expected)) {
      throw new Error("The live elephant logo is unavailable or differs from the reviewed asset. No templates were published.");
    }
  }
  const result = await publishTemplates({
    token, apply, patch,
    saveBackup: async (backup) => {
      const directory = join(homedir(), "Library", "Application Support", "SPLIT", "email-template-backups");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const path = join(directory, `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`);
      await writeFile(path, `${JSON.stringify(backup, null, 2)}\n`, { mode: 0o600, flag: "wx" });
      console.log(`Template-only backup: ${path}`);
    },
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    // Do not serialize errors from fetch, which may contain request details.
    console.error(error instanceof Error && !error.cause ? error.message : "Publication failed. Check connectivity and token permissions; no credentials were logged.");
    process.exitCode = 1;
  });
}
