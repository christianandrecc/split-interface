# SPLIT release gates

October 10, 2026. Check only with linked evidence for the exact candidate. Historical results are not current hosted certification. Any P0 blocks release; applicable P1 requires completion or documented founder risk acceptance. Final deployment/distribution/public launch always requires founder approval.

## Development and internal testing

- [x] Inspect web/native/backend architecture and distinguish source from live evidence ([audit](docs/management/INITIAL_AUDIT.md)).
- [x] Web `verify:beta`: typecheck, lint (0 errors/7 warnings), 764 tests and production build pass at `4bf5a2a`.
- [x] Disposable database: 166 checks, 30 migrations replayed, two scheduler/transport migrations explicitly excluded.
- [x] Native `bf9723e`: 31 host tests and unsigned generic Simulator build pass; no device/app launch.
- [ ] Resolve fresh dependency audit failure at configured threshold (GM-02).
- [ ] Correct percentages/dirty-builder loss, native parity/reconciliation where applicable, and identity/legacy/export claims (GM-03–05). GM-03 independent acceptance failed pending editing-text/focus corrections; GM-05 `06317a5` is under independent review ([record](docs/management/WEB_BETA_PROGRESS_2026-10-10.md)).
- [ ] Approve and validate isolated integration target with synthetic accounts and outbound delivery disabled (GM-01).
- [ ] Verify complete lifecycle using A (creator), B (participant), C (outsider); extend to 3+ contributors, unknown email/@username, duplicate identities and declined invites (GM-08).
- [ ] Exercise real Auth signup/confirmation/resend/recovery/email change, expired callbacks/session refresh, account switching and native links where applicable.
- [ ] Prove current proposal approval/signing, stale rejection without writes, genuine concurrent actions, duplicate/uncertain requests, final immutability, signed-user closure protection and authorized fresh export.
- [ ] Validate web→native→web canonical state for supported capabilities; native create/sign/export if beta scope includes them.
- [ ] Verify error/retry/offline behavior, keyboard/focus, mobile layouts, VoiceOver/assistive technology and minimum OS/device behavior.

## Closed beta

- [x] Founder directs the current milestone toward web beta; native development remains separate. Cohort-facing supported capabilities/limitations still need verification before invitation.
- [ ] Exact candidate commit/deployment/migrations match; no applicable unresolved P0/core P1; independent QA evidence attached.
- [ ] Invitation sending, actual controlled inbox receipt, intended account acceptance/decline, signed delivered/bounced receipts and creator-only guarded retry verified (GM-07).
- [ ] Web production monitoring/event ingestion and actionable operator alert receipt proved; native crash/error coverage if included. No sensitive contents in telemetry.
- [ ] Current safe encrypted backup and isolated restore cover data, permissions, migrations and Vault/scheduler recovery; independent off-device key/copy arrangement approved and validated (GM-09).
- [ ] Accurate reviewed signup/signing consent and privacy/retention disclosures; no unreviewed final legal publication or enforceability promise (GM-10).
- [ ] Working support inbox/replies, closure operator/identity verification/session revocation procedure and incident escalation tested.
- [ ] Cohort recruitment/access control, onboarding and feedback channel ready; custom-domain access/signup boundaries verified; no unauthorized outreach.
- [ ] Provider capacity/rate limits/region/spend controls and beta load/failure evidence accepted; paused SMS decision remains explicit, collected numbers not called verified.
- [ ] Native beta: approved bundle/team/icon/signing/backend config, auth/invite deep links, release archive, physical-device/minimum OS/accessibility evidence and TestFlight metadata (GM-11).
- [ ] Rollback/recovery plan respects schema compatibility and installed native versions; operator and decision authority named.
- [ ] Founder approves deployment/TestFlight distribution and cohort invitation. A READY production alias alone is not this approval.

## Public launch

- [ ] Current independent security/permission review and dependency audit; password-protection/provider-upgrade decisions resolved without unapproved spend/settings changes.
- [ ] Legal entity/audience/markets, final terms/privacy/electronic-record consent, privacy requests/retention/subprocessors reviewed and approved.
- [ ] Disaster recovery meets approved current recovery objectives with repeatable isolated drill and off-device custody.
- [ ] Capacity, concurrency, availability/failure handling, monitoring and support staffing verified for intended audience.
- [ ] App Store/privacy/distribution obligations completed if native is released; founder authorizes submission.
- [ ] Production configuration, release identity, monitoring, incident/rollback procedure and beta defect outcomes approved.
- [ ] Privacy-reviewed funnel instrumentation and feedback/retention baselines available; targets chosen from data.
- [ ] Founder approves public release and marketing; external communications/pricing/commitments separately authorized.

## Evidence ledger

Record task/PR, commit/build ID, target environment, tester, date, accounts/fixtures used (no credentials), result, failure/denial evidence and limitations. Preserve finalized real user records; never use destructive production changes to satisfy a checklist.
