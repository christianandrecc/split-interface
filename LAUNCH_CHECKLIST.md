# SPLIT release gates

October 10, 2026. Check only with linked evidence for the exact candidate. Historical results are not current hosted certification. Any P0 blocks release; applicable P1 requires completion or documented founder risk acceptance. Final deployment/distribution/public launch always requires founder approval.

November 3 current coordination: native signing 33cbbae and local simulation 4f01499 pass bounded independent local QA. Assembled web 49eacadc now independently passes local combined maintenance, including the Tailwind/focus/tooling/CSP changes and configured production dependency audit 0. Full audit still has 12 moderate tooling entries; platform/performance and all hosted/provider/legal/integration/release gates remain open. S1+S2 is reviewed proposal evidence only. Isolated model cbda187 failed independent QA; exact correction 1f82c270 subsequently passed direct GM independent retest, closing all three findings only in local semantics ([acceptance](docs/management/qa/DOCUSIGN_MODEL_1F82C270_2026-11-03.md)). The actual service/provider/artifact gates remain open. [Exact web QA](docs/management/qa/WEB_ASSEMBLED_49EACADC_2026-11-03.md), [native scope](docs/management/DOCUSIGN_LOCAL_ALIGNMENT_V0_1_2026-11-03.md).

November 6 update: exact 49’s fresh unchanged-gate audit remains production 0; full graph is 7 moderate package entries/1 advisory after revised advisory data, not code remediation. Exact 4e2deed independently passes only the selected local memory-core/F1–F2 scope. PDF1 base6c + R1/91f5a90 now pass both platform specification reviews; the native owner delivered the first standalone PDF1 candidate at 86be367 and independent asset and parser QA is active. [Owner intake](docs/management/qa/PDF1_86BE367_OWNER_2026-11-06.md) Actual PDF/host/provider/service/device/operational/integration/release gates stay open. [Fresh audit](docs/management/qa/WEB_FROZEN49_AUDIT_REFRESH_2026-11-06.md), [core acceptance](docs/management/qa/AF1_CORE_4E2DEED_INDEPENDENT_2026-11-06.md).

November 7 PDF1 update. Independent local QA passes for exact 86be367 in the standalone package, including the six asset identities, real PDFKit checks and four rendered pages. The provenance wording correction is verified at 01de78a. Host, app, provider, device and release gates still require their own evidence. [Independent QA](docs/management/qa/PDF1_86BE367_INDEPENDENT_2026-11-07.md)

November 7 browser and contract update. Exact web 49 passed both Firefox 153 component fixture viewports. The corrected full-app Firefox 153 draft and account-isolation cases passed. Both platforms accepted AFP1 clarification e4f80e4 as a specification and standalone synthetic f5c92bb passed independent QA. The viewer fixture 7277db9 passed its nine-test independent Simulator baseline and four fault calibrations. Focused child 7603887 passed 13/13 independently; mounted checks are pending one corrected invocation after a pre-launch tool stop. Firefox preflight passed 36 scoped Node controls; stock Firefox 128 remains blocked. The narrow Chrome check stopped before launch; a specialist is qualifying an official alternate runner. [Current QA](docs/management/qa/LAUNCH_STEPS_1_2_2026-11-07.md) [Firefox fixture QA](docs/management/qa/WEB_FIREFOX153_CSP_FIXTURE_49_2026-11-07.md) · [Build stop](docs/management/qa/WEB_DIST49_PREFLIGHT_STOP_2026-11-07.md) · [AFP1 shared closure](docs/management/qa/AFP1_E4F80E4_SHARED_CLOSURE_2026-11-07.md)

## Development and internal testing

- [x] Inspect web/native/backend architecture and distinguish source from live evidence ([audit](docs/management/INITIAL_AUDIT.md)).
- [x] Web `verify:beta`: typecheck, lint (0 errors/7 warnings), 764 tests and production build pass at `4bf5a2a`.
- [x] Disposable database: 166 checks, 30 migrations replayed, two scheduler/transport migrations explicitly excluded.
- [x] Native `bf9723e`: 31 host tests and unsigned generic Simulator build pass; no device/app launch.
- [x] Resolve the configured production dependency-audit failure locally at exact 49eacadc: unchanged moderate threshold, fresh zero findings; independent installed-candidate acceptance ([QA](docs/management/qa/WEB_ASSEMBLED_49EACADC_2026-11-03.md)). This applies to the unmerged candidate, not current production.
- [ ] Review current 7 moderate full-audit tooling package entries (1 advisory; November 6 refresh; original 12 retained as dated evidence) and complete platform/performance/deployment-environment/PR/integration validation for the assembled web candidate (GM-02); no audit waiver or release approval follows from the local pass.
- [x] Verify the archived form and sample-search fixture in Firefox 153 at desktop and narrow widths with the tested CSP. [Firefox fixture QA](docs/management/qa/WEB_FIREFOX153_CSP_FIXTURE_49_2026-11-07.md)
- [ ] Verify complete app workflows and the approved minimum browser versions.
- [ ] Integrate locally accepted percentages/dirty-builder, native parity/reconciliation and identity/legacy/export corrections (GM-03–05). Independent web corrections pass at `c57f8b2` and native parity passes at `c8839cd`; actual browser reload protection, consent/provenance and hosted/integration gates remain open ([web record](docs/management/WEB_BETA_PROGRESS_2026-10-10.md), [native record](docs/management/IOS_BETA_PROGRESS_2026-10-10.md)).
- [ ] Approve and validate isolated integration target with synthetic accounts and outbound delivery disabled (GM-01).
- [ ] Verify complete lifecycle using A (creator), B (participant), C (outsider); extend to 3+ contributors, unknown email/@username, duplicate identities and declined invites (GM-08).
- [ ] Exercise real Auth signup/confirmation/resend/recovery/email change, expired callbacks/session refresh, account switching and native links where applicable. Native bounded auth hardening passes locally at f7fc8e6 (111 XCTest + 147 additional assertions/build); this does not close OS/inbox/Keychain/device/hosted evidence ([native record](docs/management/IOS_BETA_PROGRESS_2026-10-10.md)).
- [ ] Prove current proposal approval/signing, stale rejection without writes, genuine concurrent actions, duplicate/uncertain requests, final immutability, signed-user closure protection and authorized fresh export.
- [ ] Validate web→native→web canonical state for supported capabilities; native create/sign/export if beta scope includes them.
- [ ] Verify error/retry/offline behavior, keyboard/focus, mobile layouts, VoiceOver/assistive technology and minimum OS/device behavior.

## Closed beta

- [ ] DocuSign execution: independently accepted web/iOS/shared integration, server enforcement against old-client bypass, authenticated provider completion/version/party binding, exact executed PDF/certificate retrieval, current commercial/legal/privacy/retention review and separately authorized hosted validation. Local mocks and legacy acknowledgements do not close this gate. [Local plan](docs/management/DOCUSIGN_LOCAL_PLAN_2026-11-03.md).

- [x] Founder selects a combined web + iOS beta and directs GM to continue native creation/polishing after the web handoff. Cohort-facing capabilities/limitations still need verification; [native beta gates](docs/management/IOS_BETA_CHECKLIST.md) are required before combined-cohort invitation.
- [ ] Exact candidate commit/deployment/migrations match; no applicable unresolved P0/core P1; independent QA evidence attached.
- [ ] Invitation sending, actual controlled inbox receipt, intended account acceptance/decline, signed delivered/bounced receipts and creator-only guarded retry verified (GM-07).
- [ ] Web production monitoring/event ingestion and actionable operator alert receipt proved; native crash/error coverage if included. No sensitive contents in telemetry.
- [ ] Current safe encrypted backup and isolated restore cover data, permissions, migrations and Vault/scheduler recovery; independent off-device key/copy arrangement approved and validated (GM-09).
- [ ] Accurate reviewed signup/signing consent and privacy/retention disclosures; no unreviewed final legal publication or enforceability promise (GM-10).
- [ ] Working support inbox/replies, closure operator/identity verification/session revocation procedure and incident escalation tested.
- [ ] Cohort recruitment/access control, onboarding and feedback channel ready; custom-domain access/signup boundaries verified; no unauthorized outreach.
- [ ] Provider capacity/rate limits/region/spend controls and beta load/failure evidence accepted; paused SMS decision remains explicit, collected numbers not called verified.
- [ ] Native beta: independently accepted creation/draft recovery/review/signing/PDF candidates, approved bundle/team/icon/signing/backend config, auth/invite deep links, release archive, physical-device/minimum OS/accessibility evidence and TestFlight metadata (GM-04/06/11).
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
