# SPLIT agent operating rules

Read [PROJECT_STATUS.md](PROJECT_STATUS.md), [AGENT_TASKS.md](AGENT_TASKS.md), and the relevant platform instructions before starting work. The product contract is [PRODUCT_SPEC.md](PRODUCT_SPEC.md); evidence and limitations are in [docs/management/INITIAL_AUDIT.md](docs/management/INITIAL_AUDIT.md).

- Preserve the existing React/Vite web app, SwiftUI iOS app, and shared Supabase architecture. Inspect before changing; do not rewrite working systems.
- Keep GM work on `management/split-gm` focused on coordination, documentation, and review. Implement platform work in its owned worktree/branch. Never overwrite another worktree's unfinished changes or untracked files.
- `ios/` currently exists on `codex/ios-development`, not on `main`. Read its `AGENTS.md` when working there. Do not copy the old untracked prototype over the committed milestone.
- Worktrees do not isolate hosted services. SPLIT currently has one hosted backend with invitation sending enabled. Use fixtures/disposable local databases for tests. Never run signup/send/signature/cleanup scripts against hosted services without checking their side effects and authorization.
- Shared schema/RPC changes need web and iOS compatibility review, additive migrations where possible, permission tests, and a recovery plan. Never reset a shared database.
- Keep privileged keys, provider secrets, live configuration, backups, sensitive agreements, and authenticated browser traces out of this public repository and tool output. Public client configuration belongs in the approved platform configuration.
- Production deployment, migration/data changes, new spending, public publication, app submission, external contact, legal commitments, and consequential architecture/product changes need founder authorization. Past release approval is not blanket approval for another release.
- Use bounded audit/QA/backend/design specialists when authorized and useful. State objective, scope, constraints, deliverable, acceptance criteria, testing, and reporting path. Do not create more permanent chats without a user request.
- Supported chat tools can inspect and deliver handoffs; only claim delivery after a successful tool result. No automatic shared memory or continuous monitoring. Do not schedule recurring work without the founder's selected cadence.
- Tasks follow `BACKLOG → READY → IN PROGRESS → REVIEW → TESTING → COMPLETE`, or `BLOCKED`. A commit/build alone is not completion. Record acceptance evidence; QA reviews independently.
- Use Node 24 and `npm ci` in `build-it-app-main`. Web verification: `npm run verify:beta`; local database: `npm run verify:database`. `verify:deploy` also validates deployment environment and audits dependencies; it does not deploy. Its dependency gate currently needs remediation.
- Test relevant user behavior and permission boundaries. Distinguish source implementation, mocked/local tests, hosted metadata, and live multi-user verification. Update management records after meaningful progress; preserve historical reports as dated evidence.
- Submit reviewed, tested changes by PR. Do not merge to `main` without release authorization: Vercel production follows `main`. Unmerged management documents are accessible through their Git branch, not automatically present in other worktrees.

When reporting, use the founder's executive format: overall status; web; iOS; backend; quality/testing; business/launch; completed; blockers; top three priorities; founder decisions. Be concise and cite evidence.
