import { createHash } from "node:crypto";

export const PROJECT = "hpwquupkqssqqgqtwdyu";
export const SCHEMAS = ["public", "split_private", "auth", "supabase_migrations", "storage"];
export const sha256 = data => createHash("sha256").update(data).digest("hex");
export const identifier = value => `"${String(value).replaceAll('"', '""')}"`;

// Never evaluate the CLI's shell script or accept a caller-supplied restore URL.
export function connectionFromDryRun(script) {
  const vars = {};
  for (const line of script.split("\n")) {
    if (!/^export PG/.test(line)) continue;
    const match = /^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)="([^"\\\r\n$`]+)"$/.exec(line);
    if (!match || Object.hasOwn(vars, match[1])) throw new Error("Unexpected CLI connection format");
    vars[match[1]] = match[2];
  }
  if (Object.keys(vars).length !== 5 || vars.PGHOST !== "aws-0-us-east-1.pooler.supabase.com" ||
      vars.PGPORT !== "5432" || vars.PGDATABASE !== "postgres" ||
      vars.PGUSER !== `cli_login_postgres.${PROJECT}`) throw new Error("Unexpected source project");
  return vars;
}

export function localConnection(directory) {
  if (!/^\/private\/tmp\/split-restore-[A-Za-z0-9]+$/.test(directory)) {
    throw new Error("Restore requires a fresh private local directory");
  }
  return { host: directory, port: 5432, user: "split_restore_admin", database: "postgres", ssl: false };
}

export function assertSame(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} mismatch`);
}

export function localRestoreList(toc) {
  const selected = [];
  for (const line of toc.split("\n")) {
    if (!line || line.startsWith(";")) continue;
    const match = /^\d+; \d+ \d+ ([A-Z][A-Z ]*) ([^ ]+) (.+)$/.exec(line);
    if (!match) throw new Error("Unrecognized PostgreSQL archive entry");
    const [, kind, schema, name] = match;
    if (/^(PUBLICATION|SUBSCRIPTION)/.test(kind)) continue;
    if (SCHEMAS.includes(schema) || (kind === "SCHEMA" && SCHEMAS.includes(name.split(" ")[0])) ||
        (["ACL", "COMMENT"].includes(kind) && schema === "-" && name.startsWith("SCHEMA ") &&
          SCHEMAS.includes(name.split(" ")[1]))) selected.push(line);
  }
  for (const schema of SCHEMAS.filter(name => name !== "public")) {
    if (!selected.some(line => line.includes(` SCHEMA - ${schema} `))) throw new Error("Missing restore schema");
  }
  return `${selected.join("\n")}\n`;
}
