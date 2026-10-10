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
- **Platforms/completion:** web signup/login/recovery exists; iOS login/Keychain source exists, registration/recovery opens web and incoming callbacks are incomplete. Pass fresh-account and recovery inbox flows, signout/account switch/refresh, and native continuation if included in beta.

## User profiles and account settings

- **Objective/behavior:** edit creator identity, registration and preferences; keep private contact/address separate from contributor-facing snapshots. Data: user profile, username, legal/professional name, PRO/IPI, discovery/privacy preferences and account settings.
- **Permissions/errors:** owner writes; authenticated discovery and authorized participant projection only. Canonical confirmed Auth email is authoritative. Handle save failure, stale session, missing profile and account-switch cache invalidation.
- **Platforms/completion:** web editing/settings exists; iOS profile reads with web editing handoff. Verify owner changes survive reload; outsider/participant raw responses and PDFs expose only approved fields; supplied signing name exists before acknowledgement.

## Split creation and draft management

- **Objective/behavior:** create work, optional sample details, contributors and review; save an owned complete draft or send one current proposal. Data: stable document/party IDs, work metadata, share allocation and contributor contact.
- **Permissions/errors:** only creator edits/deletes unsent drafts. Reject missing work/contributor requirements, malformed shares and unsafe invite contacts before send. Warn before abandoning dirty work (GM-03); partial-draft persistence is a separate design decision. Recover failed saves without changing document identity or claiming server persistence.
- **Platforms/completion:** web four-step builder exists; native editor absent. Verify create/save/resume/delete/send on each supported platform, server-confirmed persistence, and failure/exit recovery without data loss.

## Contributor management and ownership allocation

- **Objective/behavior:** identify collaborators by explicit email invitation (including before signup) or exact @username, with access subsequently bound to the confirmed authenticated account; select/display legal/professional role data and allocate exact 100%. Data: party ID, canonical membership user ID, invite method/value, registration snapshot and share.
- **Permissions/errors:** creator manages unsent parties; each account updates its own approved registration through guarded actions. Reject duplicates, ambiguous/unresolved identity claims, >2 decimal shares and totals above/below 100. Do not silently round ownership to achieve consensus.
- **Platforms/completion:** web custom input currently accepts precision the server rejects (GM-03); native counters already use exact hundredths. Match UI/server cases including three-way allocation and attempted party substitution; outsider cannot bind another person's invite.

## Invitations

- **Objective/behavior:** sent-sheet participants receive in-app access and eligible invitation email; explicitly accept/decline before proposal participation. Unknown username recipients wait for a confirmed account address; notification receipt is distinct from participation.
- **Data/permissions/errors:** canonical invitation/membership, sheet ID, immutable email job identity, current recipient binding and status. Creator-only diagnostics/retry; service-only worker and signed receipts. Cancel accepted/declined/changed-recipient jobs, bound expiry/retries, protect duplicate/ambiguous sends, and handle expired/unauthorized links without leaking documents.
- **Platforms/completion:** web invitation response/delivery UI; native response exists, creation/delivery UI absent. Prove approved controlled-inbox receipt, correct authenticated continuation/acceptance/decline, creator-only failures/retry, and unrelated-account denial. No SMS invitation capability.

## Negotiation and agreement revisions

- **Objective/behavior:** view agreement/proposal comparison and communicate, accept or counter allocation. Counter creates a new current proposal, preserves history and requires fresh responses; earlier signatures must not finalize the new version.
- **Data/permissions/errors:** current proposal ID/server revision, canonical party percentages, message body/author/time and response history. Pending invitees can read/chat; approval/counter/sign require invitation acceptance and their applicable author/consensus checks. Finalized or declined participants cannot mutate. A participant cannot counter their own current proposal or counter before their own invitation is accepted. Counters can remain available after earlier approval/rejection/signing while unfinished, according to the server. Reject stale race atomically and refresh uncertain message results without resending confirmed text.
- **Platforms/completion:** both platforms implement chat/approval/counters; native combined action gate and whitespace reconciliation differ (GM-04). Pass the same eligibility table on web/iOS/server; preserve newly typed text and show revision history across reloads.

## Approval and electronic signing

- **Objective/behavior:** each authenticated party reviews and explicitly acknowledges the current agreement; approval alone is not signing. Data: proposal ID, canonical signer user/party identity, supplied legal-name snapshot, server time, acknowledgement method and audit event.
- **Permissions/errors:** actor can sign only their own party; all current required parties must have joined/approved. Reject stale proposal, forged signer/time, duplicate signature, missing legal identity and finalized writes with no partial changes. Current server allows ready parties in any order; UI/export must not claim ordered enforcement (GM-05).
- **Platforms/completion:** web has a direct signing button; native signing is a web handoff. Review actual signing presentation/consent with qualified counsel; verify explicit informed action, per-user identity, current-proposal consensus and denial cases. Technical tests do not establish legal enforceability.

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
- **Platforms/completion:** shared RPCs, separate native/web models and polling exist; native notification/push and auth/invitation callbacks incomplete. Test web-created agreement in iOS, native counter in web, current-proposal response/signature invalidation, refresh/signout, and outsider denial on an approved isolated target.

## Account closure and sensitive-record retention

- **Objective/behavior:** verified owner can request closure, understand retained shared records, and receive actual operational resolution. Data: identity verification, operator action/decision, session revocation and reviewed retention schedule.
- **Permissions/errors:** no client automatic deletion; signed account-deletion guard preserves evidence. Manual support request is not completed closure; access stays active until verified revocation. Do not promise blanket deletion or invented retention periods.
- **Platforms/completion:** web manual request exists; native handoff; backend guard has local tests. Name an operator, confirm support/replies, test old tokens and data handling in isolation, and obtain reviewed user-facing policy before release.

All applicable completion criteria feed [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md); changes need shared tests and updates to this contract.
