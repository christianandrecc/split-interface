import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PROJECT, sha256 } from "./safety.mjs";

export const SYNTHETIC_TARGET = "split-synthetic-recovery-only";
export const MIGRATIONS_DIRECTORY = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));
export const MANIFEST_PATH = fileURLToPath(new URL("../../docs/backend-beta-manifest.json", import.meta.url));
export const HOSTED_MIGRATIONS = [
  "20260929163923_schedule_split_invitation_emails.sql",
  "20260929164820_restrict_invitation_scheduler_transport.sql",
];

export function migrationInventory() {
  return readdirSync(MIGRATIONS_DIRECTORY).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort().map(name => ({
    name, sha256: sha256(readFileSync(`${MIGRATIONS_DIRECTORY}/${name}`)),
    localMode: HOSTED_MIGRATIONS.includes(name) ? "inert-platform-shim" : "application-sql",
  }));
}

// This is deliberately not a project/connection-string validator for live restores.
export function requireSyntheticTarget(target) {
  if (target !== SYNTHETIC_TARGET || target === PROJECT) throw new Error("Synthetic target required");
}

export function validatePreparationManifest(manifest) {
  if (manifest.format !== 1 || manifest.state !== "PREPARED_NOT_PROVISIONED"
    || manifest.productionProjectRef !== PROJECT || manifest.approval.organizationId !== null
    || manifest.approval.costQuote !== null || manifest.approval.resourceCreationApproved !== false
    || manifest.approval.providerSpendingApproved !== false || manifest.approval.backupDestinationApproved !== false
    || manifest.approval.keyCustodyApproved !== false
    || manifest.target.projectRef !== null || manifest.target.branchId !== null
    || manifest.target.webOrigin !== null || manifest.target.nativeCallback !== null) {
    throw new Error("This preparation manifest cannot authorize or represent a hosted target");
  }
  if (manifest.isolation.productionDataCopy !== false || manifest.isolation.productionSecretCopy !== false
    || manifest.isolation.productionUserImport !== false || manifest.isolation.credentialsInRepository !== false
    || manifest.isolation.testRecipients.length !== 0
    || manifest.outbound.invitationEnabled !== false || manifest.outbound.cronActive !== false
    || manifest.outbound.workerUrl !== null || manifest.outbound.deliveryTestingApproved !== false
    || manifest.outbound.receiptWebhookConfigured !== false || manifest.outbound.workerDeployed !== false
    || manifest.outbound.independentTestSecretsOnly !== true || manifest.outbound.noProductionWorkerTokenRecovery !== true
    || manifest.auth.publicSignupInitiallyEnabled !== false
    || manifest.auth.phoneRequired !== false || manifest.auth.frontendPhoneVerification !== false
    || manifest.auth.integrationProductionRedirectFallback !== false
    || manifest.telemetry.productionTestEvents !== false || manifest.telemetry.projectRoute !== null
    || manifest.telemetry.operatorAlertVerified !== false || manifest.telemetry.creatorFailureReceiptVerified !== false
    || manifest.recovery.sourceVaultRowsArchived !== 0 || manifest.recovery.offDeviceCopyConfigured !== false
    || manifest.recovery.independentKeyEscrowConfigured !== false || manifest.recovery.reactivationApproved !== false
    || manifest.verification.hostedClaims !== false
    || JSON.stringify(manifest.dataApi.exposedSchemas) !== JSON.stringify(["public"])) {
    throw new Error("Unsafe preparation manifest");
  }
  const actual = migrationInventory();
  if (actual.length !== 32 || manifest.schema.migrationCount !== 32 || manifest.schema.localApplicationSqlCount !== 30
    || manifest.schema.localInertPlatformCount !== 2 || JSON.stringify(manifest.schema.migrations) !== JSON.stringify(actual)) {
    throw new Error("Migration inventory changed; review and regenerate the preparation manifest");
  }
  return actual;
}

export function readPreparationManifest() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  validatePreparationManifest(manifest);
  return manifest;
}
