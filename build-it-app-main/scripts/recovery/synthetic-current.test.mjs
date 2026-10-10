import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readPreparationManifest, validatePreparationManifest, requireSyntheticTarget, SYNTHETIC_TARGET } from "./beta-preparation.mjs";
import { runSyntheticRecovery } from "./synthetic-current.mjs";

test("preparation inventory matches all 32 reviewed migration files without authorization", () => {
  const manifest = readPreparationManifest();
  assert.equal(manifest.schema.migrations.length, 32);
  assert.equal(manifest.approval.resourceCreationApproved, false);
  assert.equal(manifest.approval.organizationId, null);
});

test("manifest fails closed on target, cost, delivery, callback, API or migration drift", () => {
  const baseline = readPreparationManifest();
  const mutations = [
    m => { m.target.projectRef = m.productionProjectRef; },
    m => { m.approval.resourceCreationApproved = true; },
    m => { m.approval.organizationId = "unapproved-organization"; },
    m => { m.approval.costQuote = "unapproved"; },
    m => { m.approval.providerSpendingApproved = true; },
    m => { m.approval.keyCustodyApproved = true; },
    m => { m.target.webOrigin = "https://www.mysplit.co/"; },
    m => { m.outbound.invitationEnabled = true; },
    m => { m.outbound.cronActive = true; },
    m => { m.outbound.workerUrl = "https://unapproved.example/"; },
    m => { m.outbound.workerDeployed = true; },
    m => { m.outbound.receiptWebhookConfigured = true; },
    m => { m.auth.integrationProductionRedirectFallback = true; },
    m => { m.isolation.productionSecretCopy = true; },
    m => { m.isolation.productionUserImport = true; },
    m => { m.isolation.testRecipients.push("synthetic@example.test"); },
    m => { m.telemetry.operatorAlertVerified = true; },
    m => { m.recovery.reactivationApproved = true; },
    m => { m.verification.hostedClaims = true; },
    m => { m.dataApi.exposedSchemas.push("net"); },
    m => { m.schema.migrations[0].sha256 = "altered"; },
  ];
  for (const mutate of mutations) {
    const manifest = structuredClone(baseline); mutate(manifest);
    assert.throws(() => validatePreparationManifest(manifest));
  }
});

test("synthetic harness cannot select another database or production target", () => {
  requireSyntheticTarget(SYNTHETIC_TARGET);
  for (const target of [null, "hpwquupkqssqqgqtwdyu", "localhost", "postgresql://host/database", "https://test.supabase.co", "/tmp/database"]) {
    assert.throws(() => requireSyntheticTarget(target));
  }
});

test("command line refuses connection URLs, archive paths and credentials before starting a drill", () => {
  const script = fileURLToPath(new URL("./synthetic-current.mjs", import.meta.url));
  for (const argument of ["postgresql://synthetic-user:synthetic-password@invalid.example/db", "/tmp/supplied.dump", "--token=synthetic-only"]) {
    const result = spawnSync(process.execPath, [script,argument], { encoding: "utf8", timeout: 10000 });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /accepts no arguments/);
    assert.ok(!result.stderr.includes(argument));
  }
});

test("current synthetic restore preserves signed evidence and privileges while rejecting unsafe recovery", { timeout: 60000 }, async () => {
  const proof = await runSyntheticRecovery();
  assert.equal(proof.migrationFiles, 32);
  assert.equal(proof.permissionContexts, 5);
  assert.equal(proof.sourceVaultRowsArchived, 0);
  assert.equal(proof.syntheticSourceSecretRowsQuarantined, 1);
  assert.equal(proof.syntheticSourceNetworkRequestsQuarantined, 1);
  for (const name of ["signedEvidenceDigestsMatch", "permissionAndEvidenceDriftDetected", "wrongTargetAndMigrationRejected", "wrongKeyAndTamperingRejected",
    "fixturePreviousWorkerTokenAbsentFromArchive",
    "freshIndependentWorkerSecretVerified", "previousWorkerSecretRejected", "cronInactive", "invitationQueueQuarantined", "directNetworkDenied"]) {
    assert.equal(proof[name], true, name);
  }
  assert.equal(proof.outboundDeliveryActivated, false);
});
