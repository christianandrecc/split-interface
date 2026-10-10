# SPLIT initial management audit

Date: October 10, 2026 (America/New_York). GM baseline `4bf5a2ae5e3d37f51750990506533733d686f8b6`; native baseline `bf9723e32f109d71083c02959535861f30257edc`. Read-only product/cloud assessment with local disposable tests and documentation changes only. No production release, data/schema/settings write, invitation/SMS send, app submission, or new schedule.

## Architecture and repository state

- Web: React 18 + TypeScript + Vite 7, Radix/shadcn/Tailwind; component/state navigation in App/Dashboard, root/catch-all routing; Supabase JS 2.112.2, Auth/RLS/RPCs. Vercel API route proxies Apple Music with server-only secrets. Entry points: [App](../../build-it-app-main/src/App.tsx), [Dashboard](../../build-it-app-main/src/components/Dashboard.tsx), [package](../../build-it-app-main/package.json).
- Native: SwiftUI/iOS 17+, main-actor observable stores, actor repository, Supabase Swift pinned 2.55.3, value domain models and Keychain session source. Live/fixture repositories are injected; fixtures are Debug-only. Source is committed only on `codex/ios-development`; inspect with `git show codex/ios-development:ios/<path>`.
- Backend: nine public app tables (`profiles`, `account_settings`, splits, collaborators, proposals, responses, audit, delivery, notifications) plus four private email/phone tables. Shared authenticated public RPC facade wraps guarded canonical writes/projections. Web/native use the same account, document/revision/proposal/party identity contract; models are separate and need parity tests.
- No stored PDF objects: hosted `storage.buckets` query returned none; web creates PDFs from authorized fresh records in browser. No independent native backend/projects service exists.
- No root AGENTS/core management docs or checked-in browser E2E/CI workflow were found before this setup. Existing feature/release/recovery/legal notes were reused, not replaced by a new tracking product.

| Worktree | Baseline / ownership | Observed state |
| --- | --- | --- |
| `/Users/christiancarrera/Documents/SPLIT INTERFACE (CODEX)` | `main`, `4bf5a2a`; web | Tracked state clean. Untracked design outputs, `ios/`, legal review package and temp outputs preserved |
| `/Users/christiancarrera/.codex/worktrees/22b2/SPLIT INTERFACE (CODEX)` | `codex/ios-development`, `bf9723e`; native | Clean before/after read-only audit; 29 Swift/script baseline and design blueprint preserved by existing milestone |
| Current `3303` checkout | Initially detached `4bf5a2a`; now `management/split-gm` | Initially clean; only management docs changed |

Other local branches observed: `agent/update-split-latest`, `fix/server-owned-split-saves`, account-isolation/message-sync/audit-boundary/dashboard-summary/agreement-mapping priority branches. Their current ownership/merge intentions were not established; no branches/worktrees were deleted or overwritten. Remote `main` readback matches `4bf5a2a`.

## Product assessment

Web source supports account/profile, four-step create/draft/send, email/@username contributors, invitations, messages/counters/approvals, current-party acknowledgement, immutable final records and authorized PDF download. Native supports sign-in/read/list/detail/profile, invite accept/decline, messages/counters/approvals; create/sign/PDF/signup/recovery/profile edits are explicit web handoffs. Native deep-link parser exists without active incoming-link/callback continuation. Both refresh via polling/focus/foreground; live cross-platform synchronization was not rerun.

Canonical writes derive actor/identity/server time, lock agreement/revision/proposal, scope membership, reject stale/forged signatures and preserve completed records. Source references under `build-it-app-main/`:

| Finding | Evidence |
| --- | --- |
| Draft ownership / current signature and proposal guards | `supabase/migrations/20260910220712_enforce_split_signature_ownership.sql:122`; latest participant writer `20260911164913_capture_collaborator_registration.sql:46,181,189,238` |
| Private profile projection/raw document boundary | `20260911163414_enforce_split_profile_privacy.sql:123`; signed-account deletion guard `20260912021844_protect_signed_account_deletion.sql:9` |
| Creation precision differs from exact server rule | `src/components/contract-builder/StepParties.tsx:65,88`; `types.ts:245`; `ContractBuilder.tsx:70`; server migration `20260910220712...:134` |
| Early builder exits lose React-state edits | `ContractBuilder.tsx:60,79,188,200,250`; no partial draft/exit guard in active flow |
| Missing-profile login can invent legal-name fallback | `src/lib/profileStorage.ts:691`; canonical server checks nonempty stored legal name, not whether user actually supplied it |
| Legacy final details infer completion | `src/components/AgreementDetail.tsx:182`; absent signature rows may still show all signed |
| PDF badge lacks canonical signer binding/name requirement | `src/lib/splitSheetPdfModel.ts:37,51`; `splitSheetPdf.ts:366`; fixture without signer IDs in `src/test/splitSheetPdf.test.ts:15` |
| Current signing-order metadata is unenforced | Defaults `types.ts:359`; detail `AgreementDetail.tsx:620`; PDF model `:118`; server `20260911164913...:189`. Orphan StepSignatures/StepRights are not reachable in current four-step builder |
| Native counter eligibility differs from web/server | Native `ios/SPLIT/Domain/Models.swift:61`, `Domain/Workspace.swift:238`; web `src/lib/splitSheetNegotiation.ts:275`; server latest writer `:90,117` |
| Native uncertain-message trimming mismatch reproduced | Native `Domain/Workspace.swift:233`, `Features/Messages/ConversationStore.swift:38`, fixture `Data/ConversationRepository.swift:77` |
| Native release scaffold incomplete | Native `SPLIT.xcodeproj/project.pbxproj:59`; fixture bundle `co.mysplit.ios.fixture`, “SPLIT Preview”, no team/AppIcon/incoming links; generator must match project changes |

Elephant is deterministic help/shortcuts, not model-generated negotiation. Publishing/admin, external registrations, CSV/JSON exports, scheduled reminders, signature/proposal emails, SMS invitations and automatic signed-PDF delivery are not verified active capabilities. Mock feed/profile/deal files and orphan steps do not establish runtime features. No sent-sheet participant/work-identity correction flow was identified.

## Current hosted metadata (read-only)

- Supabase `hpwquupkqssqqgqtwdyu`: `ACTIVE_HEALTHY`, region `us-east-1`, PostgreSQL API version `17.6.1.155`. Hosted migration versions match all 32 local files. Only main/default backend branch found; no hosted staging.
- All nine public and four private app tables have RLS enabled. Private deny-by-default notices are expected for service-only tables; advisor output does not independently prove every effective grant/policy correct.
- Sending config enabled with activation September 29; worker URL configured; active minutely `split-invitation-emails` cron job. Phone `required=false`. Vault secret **count only** checked: one; no secret value/name retrieved.
- `send-split-invitations` and `split-invitation-delivery` ACTIVE v3 with gateway `verify_jwt=false`; source uses worker bearer/signed Svix verification respectively. Last recorded receipt secret/provider subscription state is incomplete; deployment does not prove receipts work. No requests sent to trigger delivery or test events.
- Aggregate-only finalized signer query found incomplete signer identity/name evidence in an existing finalized record. No agreement ID, contents, participant identity or signature was returned. This proves legacy/provenance debt exists, not that the record currently earns a PDF badge or that an unauthorized signing exploit occurred.
- Security advisor: one anonymous signup-username lookup definer notice, 14 authenticated definer notices, four private RLS-no-policy INFO findings, leaked-password protection disabled. Do not blindly remove required RPC access. Remediation links are in [RISKS](../../RISKS.md).
- Performance advisor: seven unindexed foreign-key INFO and nine unused-index INFO findings; no index mutation. Size/query impact needs load evidence before changes.
- Vercel project `prj_vAnOpINepfyeLGEcNOZvoX9LCa96`, team `team_U440ZAwaRZWJfAEr5NinuDyf`, Node 24. Latest production `dpl_9MWMTQuvygtSKaPnkQT5yioUkorP` READY, Git commit `4bf5a2a`, aliases include `www.mysplit.co`, `mysplit.co`, `mysplit.com`. SSO `all_except_custom_domains`; do not assume custom-domain cohort protection. No deployment/environment change.
- Checked-in Vercel build uses `npm run verify:deploy`; current npm audit failure prevents that gate from passing now even though this older deployed build is READY.
- GitHub current open issue/PR searches returned none. No branch-protection or release-approval enforcement claim made.

Current [Supabase changelog](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) describes PostgreSQL 17.11 security/correctness rollout; observed 17.6 metadata warrants a compatibility/maintenance review. No ltree/btree_gist extension found in inspected extension metadata. Do not infer a demonstrated exploitable app path or initiate upgrade from this audit.

## Fresh verification

Node `24.15.0`; lockfile installed in GM checkout via `npm ci --ignore-scripts --audit=false --fund=false` (no dependency/lockfile edits).

| Check | Result and limits |
| --- | --- |
| `npm run verify:beta` | Exit 0; TypeScript pass; ESLint 0 errors/7 Fast Refresh warnings; **764 tests in 75 files**; Vite production build pass. Expected ErrorBoundary fixture logs contain synthetic “Sensitive agreement contents”; these are deliberate passing tests, not exposed real data |
| `npm run verify:database` | Exit 0; **166 checks**, **30 migrations replayed**; two cron/net/Vault scheduler/transport migrations deliberately excluded. Auth is a local claim shim, not live GoTrue |
| `npm audit --omit=dev --json` | Exit 1; **8 package entries: 6 high, 2 moderate**. Tailwind/braces/chokidar/fast-glob/micromatch/PostCSS selector/source-map dependency tree. Patch/exposure review needed; not proof of browser exploit |
| Native XCTest | **31 passing**, zero failures; host/domain/store/intercepted HTTP. Excludes WorkspaceSession, actual Keychain and SwiftUI/device behavior |
| Native Debug generic Simulator build | **BUILD SUCCEEDED**, Xcode 26.5 / Swift 6.3.2; signing disabled, isolated `/tmp` DerivedData/cache. No simulator boot/app launch/backend configuration |
| Native whitespace reproduction | Synthetic trimming repository compiled with current source: confirmed “Hello there” but draft “  Hello there  ” remained and refresh-needed false after interrupted send. No backend call |

Web raw logs: `/tmp/split-gm-web-gate.log`, database `/tmp/split-gm-database-gate.log`, audit `/tmp/split-gm-dependency-audit.json`. Native logs: `/tmp/split-ios-gm-audit-swift-test.log`, `/tmp/split-ios-gm-audit-xcodebuild.log`; synthetic repro `/tmp/split-ios-gm-audit-20261010/`. These temporary logs are not committed; [verification summary](verification-2026-10-10.json) persists sanitized outcomes.

Build outputs warn about main JS ~1.36 MB minified (~388 KB gzip) and lazily loaded PDF assets ~1.17 MB (~517 KB gzip). Host tests/fixture evidence do not substitute for browser/mobile performance, accessibility, inbox delivery, real concurrency or device validation.

## Recovery, legal and operations

Existing [database recovery notes](../../build-it-app-main/docs/database-recovery.md) prove a dated September snapshot/isolated restore, not the current environment. Snapshot covers 23 migrations; backup tool `scripts/recovery/backup-local.mjs:223` aborts on any storage/Vault content. Current active scheduler needs Vault; current capture would refuse. No live backup/dump attempted. Independent/off-device key and copy, scheduler-disable restoration and approved secret recovery need design/drill.

Shipped [terms](../../build-it-app-main/public/legal/terms.html) and [privacy](../../build-it-app-main/public/legal/privacy.html) explicitly identify beta placeholders. Existing untracked `legal-review-2026-09-11/` in the main checkout contains Terms, Privacy, Electronic Records/Signature Consent and readiness drafts for licensed counsel; its older technical findings must be reconciled against current migrations. Drafting is not legal approval. Preserve the original packet; no documents published or legal commitments made.

Account closure remains a manual request/guard rather than complete operational revocation/retention. Support-email setup was deferred; actual inbox/operator state must be verified. Sentry production variables were configured historically, but current ingestion/alert receipt was not rerun. Apple developer account/enrollment, current provider billing, aggregate usage and product KPI baselines remain unverified. No cost or performance targets invented.

Existing automations inspected read-only: weekly “Revisit SPLIT beta SMS verification” ACTIVE on web chat; “Prioritize SPLIT email and account closure” PAUSED. No GM continuous-monitor/daily schedule exists or was created. Reminder text is historical context, not new authority to activate paused services.

## Readiness and coordination conclusion

- **Development/fixture testing:** supported by fresh local evidence.
- **Live internal testing:** requires approved safe target and controlled-account plan; current backend sends real invitations.
- **Web closed beta:** core implementation substantial; dependency/workflow/provenance and environment/hosted QA/recovery/legal/operations gates open.
- **Combined native beta:** same shared gates plus missing native lifecycle/auth/device/distribution work.
- **Public launch:** no recommendation until current security/legal/recovery/support/scale/distribution gates and founder approval.

Use current [spec](../../PRODUCT_SPEC.md), [matrix](../../FEATURE_MATRIX.md), [tasks](../../AGENT_TASKS.md), [roadmap](../../ROADMAP.md) and [launch checklist](../../LAUNCH_CHECKLIST.md). Docs on the GM branch are not automatically present in web/native worktrees; read via `git show management/split-gm:<path>` until reviewed integration. Preserve existing owner isolation and deliver handoffs only through supported tools.
