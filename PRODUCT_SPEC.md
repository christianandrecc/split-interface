# SPLIT shared product specification

Baseline: October 10, 2026. This is the inspected behavior and proposed beta acceptance contract. A completion criterion is a requirement to validate, not a claim it already passed. Platform status is in [FEATURE_MATRIX.md](FEATURE_MATRIX.md). Scope changes need a decision record.

Current beta scope: **web + iOS**, selected directly by the founder and recorded in D-16. A phone must support native creation, participation/negotiation, full review/own-party signing and finalized retrieval/sharing on the same canonical records. [Native acceptance checklist](docs/management/IOS_BETA_CHECKLIST.md). Hosted integration remains deferred under the local-only testing decision.

## Shared rules

- One Supabase Auth identity and one authoritative agreement state across platforms. Derive authority from the authenticated account and canonical membership, never editable profile claims or supplied actor labels.
- Current canonical agreement requires creator plus every stored collaborator. Invitation acceptance, proposal approval, and signing are separate actions. Every required participant must accept/approve/sign the current proposal before finalization.
- Ownership uses integer hundredths: each share 0–100%, at most two decimals, exact total 100%. Preserve canonical party IDs. Zero-share behavior follows the existing server constraint until a deliberate product decision changes it.
- Saves/actions carry expected server revision and proposal identity. Reject stale/unauthorized operations atomically; refresh before retry. Draft ownership and sent participant permissions differ.
- Sent counters currently revise ownership allocation while retaining participants and work metadata. Changing sent contributors/work identity is not a supported workflow to invent implicitly.
- Finalized agreement data, signature snapshots and audit history must remain preserved. Closure and delivery bookkeeping must not rewrite the signed content.
- Synchronization is currently polling/focus refresh, not guaranteed instantaneous delivery. Show uncertain/offline outcomes honestly and prevent blind duplicate actions.
- Phone collection does not prove possession. SMS enforcement is paused; invitations use email/@username. Real AI, publishing submission, reminders and automatic PDF delivery are deferred.

## Account creation and authentication

- **Objective/behavior:** establish a creator account through confirmed email; sign in, refresh, recover and switch accounts without leaking prior state. Required data: canonical user ID/email, password, username, supplied legal/professional names, required phone, versioned signup acknowledgements.
- **Permissions/errors:** account-owner session/profile only; reject unavailable username/invalid input, expired callback, incorrect credentials, and missing profile; retry confirmation/recovery without treating API success as inbox receipt. Do not infer legal identity from an email local part for signing (GM-05).
- **Platforms/completion:** web signup/login/recovery exists; native auth hardening `f7fc8e6` passes independent local acceptance, closing raw-path/restored-grant/late-account findings with 111 XCTest + 147 additional assertions/build. Registration/profile/consent still uses web. Real inbox/server PKCE settings, warm/cold OS delivery, Keychain/device and hosted session behavior remain unverified. Genuine account/recovery/session/invitation journeys remain required for combined beta.

## User profiles and account settings

- **Objective/behavior:** edit creator identity, registration and preferences; keep private contact/address separate from contributor-facing snapshots. Data: user profile, username, legal/professional name, PRO/IPI, discovery/privacy preferences and account settings.
- **Permissions/errors:** owner writes; authenticated discovery and authorized participant projection only. Canonical confirmed Auth email is authoritative. Handle save failure, stale session, missing profile and account-switch cache invalidation.
- **Platforms/completion:** web editing/settings exists; iOS profile reads with web editing handoff. Verify owner changes survive reload; outsider/participant raw responses and PDFs expose only approved fields; supplied signing name exists before acknowledgement.

## Split creation and draft management

- **Objective/behavior:** create work, optional sample details, contributors and review; save an owned complete draft or send one current proposal. Data: stable document/party IDs, work metadata, share allocation and contributor contact.
- **Permissions/errors:** only creator edits/deletes unsent drafts. Reject missing work/contributor requirements, malformed shares and unsafe invite contacts before send. Warn before abandoning dirty work (GM-03). Native protected incomplete editing is a separate account-bound local record, never a queued send/sign action or claim of server persistence. Recover failed saves without changing document identity.
- **Platforms/completion:** web and native four-step builders exist; native creation/protected recovery passes bounded local acceptance at `084220d`. Verify integrated create/save/resume/delete/send on each supported platform, server-confirmed persistence, physical storage protection, and failure/exit recovery without data loss.

## Contributor management and ownership allocation

- **Objective/behavior:** identify collaborators by explicit email invitation (including before signup) or exact @username, with access subsequently bound to the confirmed authenticated account; select/display legal/professional role data and allocate exact 100%. Data: party ID, canonical membership user ID, invite method/value, registration snapshot and share.
- **Permissions/errors:** creator manages unsent parties; each account updates its own approved registration through guarded actions. Reject duplicates, ambiguous/unresolved identity claims, >2 decimal shares and totals above/below 100. Do not silently round ownership to achieve consensus.
- **Platforms/completion:** web precision/editing/focus corrections pass bounded local acceptance at `c57f8b2`; native creation/counters use exact hundredths and creation passes locally at `084220d`. Actual browser reload protection and integration remain open. Match UI/server cases including three-way allocation and attempted party substitution; outsider cannot bind another person's invite.

## Invitations

- **Objective/behavior:** sent-sheet participants receive in-app access and eligible invitation email; explicitly accept/decline before proposal participation. Unknown username recipients wait for a confirmed account address; notification receipt is distinct from participation.
- **Data/permissions/errors:** canonical invitation/membership, sheet ID, immutable email job identity, current recipient binding and status. Creator-only diagnostics/retry; service-only worker and signed receipts. Cancel accepted/declined/changed-recipient jobs, bound expiry/retries, protect duplicate/ambiguous sends, and handle expired/unauthorized links without leaking documents.
- **Platforms/completion:** web invitation response/delivery UI exists; native creation/response and account/invitation continuation `f7fc8e6` pass bounded local QA. Native receipt diagnostics and actual delivery remain unverified. Prove approved controlled-inbox receipt, correct authenticated continuation/acceptance/decline, creator-only failures/retry, and unrelated-account denial. No SMS invitation capability.

## Negotiation and agreement revisions

- **Objective/behavior:** view agreement/proposal comparison and communicate, accept or counter allocation. Counter creates a new current proposal, preserves history and requires fresh responses; earlier signatures must not finalize the new version.
- **Data/permissions/errors:** current proposal ID/server revision, canonical party percentages, message body/author/time and response history. Pending invitees can read/chat; approval/counter/sign require invitation acceptance and their applicable author/consensus checks. Finalized or declined participants cannot mutate. A participant cannot counter their own current proposal or counter before their own invitation is accepted. Counters can remain available after earlier approval/rejection/signing while unfinished, according to the server. Reject stale race atomically and refresh uncertain message results without resending confirmed text.
- **Platforms/completion:** both platforms implement chat/approval/counters; native eligibility/whitespace corrections pass bounded local acceptance at `c8839cd`. Verify integrated parity on web/iOS/server; preserve newly typed text and show revision history across reloads.

## Approval and electronic signing

- **Objective/behavior:** each authenticated party reviews and explicitly acknowledges the current agreement; approval alone is not signing. Data: proposal ID, canonical signer user/party identity, supplied legal-name snapshot, server time, acknowledgement method and audit event.
- **Permissions/errors:** actor can sign only their own party; all current required parties must have joined/approved. Reject stale proposal, forged signer/time, duplicate signature, missing legal identity and finalized writes with no partial changes. Current server allows ready parties in any order; UI/export must not claim ordered enforcement (GM-05).
- **Platforms/completion:** web signing/evidence corrections pass bounded local acceptance at `c57f8b2`; native full review/own-party signing `e1ec61d` is delivered with developer 106 code/HTTP tests and independent acceptance failed with one P1/two P2; corrections and immutable retest required before PDF. Review actual signing presentation/consent with qualified counsel; verify explicit informed action, per-user identity, current-proposal consensus and denial cases. Technical tests do not establish legal enforceability.

## Finalized access, exports and history

- **Objective/behavior:** retain finalized agreement/proposals/audit and allow authorized users to retrieve/download a faithful record after reload. Data: frozen current payload plus signature/audit history; PDF rendered from a fresh authorized server record.
- **Permissions/errors:** owner/authorized member reads only; no stale sent-record export fallback. Reject unauthorized retrieval; handle offline failure without replacing signed content. Legacy/local evidence must receive truthful labels, not inferred verified signature claims (GM-05).
- **Platforms/completion:** web list/detail/PDF exists; native reads exist, PDF/share absent. There is no preserved PDF storage bucket or verified CSV/JSON/PRO/MLC submission. Compare exported work, shares, signer snapshots and proposal versions with canonical state; establish reproducible retrieval/recovery. Decide any immutable PDF/hash retention with counsel before adding storage.

## Elephant assistance

- **Objective/behavior:** explain totals and guide manual agreement actions. Current implementation is deterministic contextual help and counter-editor shortcuts.
- **Data/permissions/errors:** only already-authorized document context; no AI model inference or private conversation store identified. Do not advertise automated negotiation as existing functionality.
- **Platforms/completion:** contextual helper UI exists on both; real AI is deferred. Any expansion needs privacy/cost/scope decision, clearly labeled suggestions and human-controlled legal actions.

## Cross-platform synchronization and notifications

- **Objective/behavior:** same account sees the same canonical work/current proposal, invitations, signatures and audit events on web/iOS. Poll/focus/foreground refresh should recover stale views.
- **Data/permissions/errors:** canonical IDs, revisions, proposal identity, participant projection and notification recipient. Expired sessions, offline/uncertain results and rapid competing actions must not mix accounts or duplicate writes.
- **Platforms/completion:** shared RPCs, separate native/web models and polling exist; native auth/invitation hardening passes local QA at f7fc8e6, while actual OS/hosted callback proof and notification/push remain open. Test web-created agreement in iOS, native counter in web, current-proposal response/signature invalidation, refresh/signout, and outsider denial on an approved isolated target.

## Account closure and sensitive-record retention

- **Objective/behavior:** verified owner can request closure, understand retained shared records, and receive actual operational resolution. Data: identity verification, operator action/decision, session revocation and reviewed retention schedule.
- **Permissions/errors:** no client automatic deletion; signed account-deletion guard preserves evidence. Manual support request is not completed closure; access stays active until verified revocation. Do not promise blanket deletion or invented retention periods.
- **Platforms/completion:** web manual request exists; native handoff; backend guard has local tests. Name an operator, confirm support/replies, test old tokens and data handling in isolation, and obtain reviewed user-facing policy before release.

All applicable completion criteria feed [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md); changes need shared tests and updates to this contract.
