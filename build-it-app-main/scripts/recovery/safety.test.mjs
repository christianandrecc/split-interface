import test from "node:test";
import assert from "node:assert/strict";
import { PROJECT, SCHEMAS, connectionFromDryRun, localConnection, identifier, assertSame, localRestoreList } from "./safety.mjs";

const fixture = `export PGHOST="aws-0-us-east-1.pooler.supabase.com"\nexport PGPORT="5432"\nexport PGUSER="cli_login_postgres.${PROJECT}"\nexport PGPASSWORD="synthetic-test-only"\nexport PGDATABASE="postgres"`;
test("accepts the linked project's session-pooler exports without evaluation", () => {
  assert.equal(connectionFromDryRun(fixture).PGDATABASE, "postgres");
});
test("rejects other projects, hosts, ports, missing, duplicate and shell-expanded values", () => {
  for (const bad of [fixture.replace(PROJECT, "unrelated"), fixture.replace("5432", "6543"),
    fixture.replace("aws-0-us-east-1.pooler.supabase.com", "example.org"),
    fixture.replace('export PGDATABASE="postgres"', ""), `${fixture}\nexport PGPORT="5432"`,
    fixture.replace("synthetic-test-only", "$(whoami)"), fixture.replace("synthetic-test-only", "`whoami`"),
    `${fixture}\nexport PGSERVICE="unexpected"`]) assert.throws(() => connectionFromDryRun(bad));
});
test("restore connections cannot target a URL, TCP host, existing app database or parent path", () => {
  for (const bad of ["localhost", "postgresql://production", "/tmp/other", "/private/tmp/split-restore-abc/..", "/private/tmp/split-restore-abc/data"]) {
    assert.throws(() => localConnection(bad));
  }
  const config = localConnection("/private/tmp/split-restore-Abc123");
  assert.equal(config.host, "/private/tmp/split-restore-Abc123");
  assert.equal(config.user, "split_restore_admin");
});
test("SQL identifiers stay quoted and integrity mismatch fails closed", () => {
  assert.equal(identifier('a";drop table x'), '"a"";drop table x"');
  assert.throws(() => assertSame({ rows: 2 }, { rows: 1 }, "data"), /mismatch/);
});

test("restore selection includes schema ownership/ACL and excludes managed extensions and replication", () => {
  const schemas = SCHEMAS.map((name, i) => `${i+1}; 2615 1234 SCHEMA - ${name} postgres`).join("\n");
  const selected = localRestoreList(`${schemas}\n99; 0 0 ACL - SCHEMA auth postgres\n100; 0 0 TABLE DATA public profiles postgres\n101; 0 0 EXTENSION - supabase_vault postgres\n102; 0 0 PUBLICATION TABLE public profiles postgres\n103; 0 0 TABLE DATA realtime messages postgres`);
  assert.match(selected, /ACL - SCHEMA auth/);
  assert.match(selected, /TABLE DATA public profiles/);
  assert.doesNotMatch(selected, /supabase_vault|PUBLICATION|realtime/);
  assert.throws(() => localRestoreList("garbled input"));
  assert.throws(() => localRestoreList("1; 2615 123 SCHEMA - public postgres"));
});
