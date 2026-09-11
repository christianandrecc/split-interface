# Deployment Readiness

For the latest release checks and migration status, see
[September 11 partner release](partner-release-2026-09-11.md).
The report below is the historical September 10 baseline, not current counts.

## September 10 Historical Report

September 10, 2026: **the user approved updating the existing projects for partner testing**. Both backend migrations are applied to Supabase project `hpwquupkqssqqgqtwdyu`; the rollback-only hosted database smoke test passed. The frontend release targets GitHub `main` and the existing protected Vercel project. Hosted browser sessions and confirmation/reset email delivery still need manual partner checks.

Vercel connector and CLI access work for `christianandreccs-projects/split-interface`. GitHub access also works. The complete local release gate and both browser checks passed after reconnection. No real user signatures, agreement contents, or email deliveries were created during verification.

## Passing Checks

- 220 UI/unit tests across 32 files, TypeScript checks, environment validation, and the local production build.
- ESLint: zero errors, seven existing component fast-refresh warnings.
- Dependency audit: zero reported vulnerabilities after dependency updates. Node 24 is specified; Supabase packages are pinned.
- Lockfile validation (`npm ci --dry-run --ignore-scripts --audit=false`) and `git diff --check` passed. A heuristic scan of application, migration, script, and documentation files found no privileged-key patterns; this is not a comprehensive secret audit. Only `.env.example`, not local environment files, is tracked.
- Dashboard: 76 header widths from 320 to 1600px; navigation, filters/sorting, global search, notifications, profile/settings, invitation review, error/retry, and PDF download checked with isolated API fixtures.
- Compiled production assets: account/recovery views, authenticated dashboard, reload, mobile layouts, and actual PDF generation passed locally. Authenticated API responses were mocked, not real accounts.
- All 17 local migrations replayed in disposable PostgreSQL. The pending permission changes preserve signup triggers and signed-in RPC access. An unrelated synthetic account cannot read the tested split through RPC or table access; invitees cannot read unsent drafts.
- Signing regression checks cover action-specific writes, authenticated signer identity/legal name/server timestamps, current-proposal consensus, creator and participant counter-offers, stale revisions, duplicate signatures, append-only audit events, immutable finalized records, and legacy unfinished records. Rejected operations are checked for zero changes across all split-related tables. These are serialized stale-client tests in PGlite, not a live multi-connection load test.
- Hosted PostgreSQL smoke test: synthetic signup/profile triggers, unsent draft isolation, in-app invitation and approval, canonical own-signature identity, stale-signature rejection, two-party finalization, outsider denial, and finalized-record protection passed under the authenticated role. All synthetic rows were rolled back. The four existing split sheets retained their pre-migration content checksum; only the new revision column was added. This does not test GoTrue sessions or real email links.
- Both Vercel environments now have validated public client configuration matching the existing SPLIT backend. The public Auth settings endpoint accepts the configured key. No privileged server keys are exposed.

The build still warns about large JavaScript chunks. These checks are not a substitute for hosted multi-account testing or a complete security review.

## Partner Testing Scope

1. **Use existing projects.** The existing Vercel project deploys GitHub `main` to its production target. The user explicitly approved updating it and the existing SPLIT Supabase project for partner testing, not a public beta.
2. **Refresh old tabs and test real accounts.** The signing migration is applied, but hosted multi-account browser verification and Auth email links remain partner checks. Verify the new Vercel build is READY before sharing its URL.
3. **In-app invitations and manual PDF downloads only.** The contract queue targets `supabase_edge_function_placeholder`; no external delivery worker is deployed. Email/SMS contract delivery is outside this testing release. Supabase Auth confirmation/reset emails are separate and still need testing.

`npm run verify:database` and the full `npm run verify:deploy` now pass locally. The configured Vercel build runs that same gate. A passing local gate does not apply migrations or validate hosted Auth/email settings.

## Hosted Configuration

- GitHub: `christianandrecc/split-interface`, public repository, default branch `main`. The deployment before this release referenced `1bdd27dccbe5d1b56c9e5a7c26e1468edd13cabb`.
- Vercel: project `prj_vAnOpINepfyeLGEcNOZvoX9LCa96`, team `team_U440ZAwaRZWJfAEr5NinuDyf`, root directory `build-it-app-main`, Node `24.x`, output `dist`.
- Current hosted build command is `npm run build`. The pending checked-in `vercel.json` specifies Vite, `npm ci`, and `npm run verify:deploy`; verify those settings are honored by the new hosted build.
- Deployment protection is configured as `all_except_custom_domains`. Preserve it and verify intended partner access on the final test URL; do not disable protection to make a check pass.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` are configured for both Preview and Production, without branch-specific overrides. Legacy write-only entries were recreated as Config variables because these are public browser settings. Both environments were pulled and passed validation against the approved SPLIT backend. Values were not printed or committed.
- Deployment protection and unrelated project settings were not changed. These environments intentionally share the existing backend for this approved partner-testing rollout; they are not isolated staging environments.

## Supabase Status

Project `hpwquupkqssqqgqtwdyu` (SPLIT) is active. All 17 migrations are applied and a second CLI dry run reports no pending migrations. All eight public application tables have RLS enabled; reviewed policies scope access by owner, participant, or notification recipient.

`20260910213449_restrict_client_function_execution.sql` and `20260910220712_enforce_split_signature_ownership.sql` are applied live. Anonymous privileged-function execution warnings are cleared; direct execution of internal helpers is revoked. The advisor still flags eight intentionally authenticated application RPC/RLS helper functions. Their authentication, ownership checks, and grants were reviewed; do not revoke the access required by the UI.

Live public Auth settings: email signup enabled, email confirmation required, phone provider disabled. The security advisor reported leaked-password protection disabled. Review password protection, custom SMTP, rate limits, Site URL, and redirect allowlists before beta; not all settings could be verified with the current connector.

## Release Sequence

1. Use the approved existing projects, limited to in-app invitations plus manual PDF downloads. Backend migration and rollback-only smoke verification are complete.
2. Commit the complete implementation and lockfile, including untracked dashboard components, PDF modules, and required assets. Exclude environment secrets, design mocks, and local test outputs.
3. Use Node 24, the app directory as Vercel project root, and the checked-in `vercel.json`. Access, root directory, and runtime are confirmed; verify the next build uses the new release gate.
4. Keep matching `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` for the approved backend. Local and Vercel values are validated. Never expose a service-role or secret key.
5. Verify the approved HTTPS auth redirect origin and Supabase allowlist for the shared hosted URL. The app uses the current deployed origin, with an existing production-origin fallback for local development.
6. Complete `beta-qa-checklist.md` with two participating accounts plus an unrelated third account. Refresh old tabs so they receive `serverRevision`; stale clients cannot write. Verify confirmation/reset email, persistence, signing, immutability, and PDF details on the hosted URL.
7. Confirm the Vercel build gate passes and deployed commit/assets match the GitHub release. Frontend rollback does not roll back database migrations; the pre-release frontend lacks the required revision-aware writes.

## Compatibility Notes

- Existing finalized records are not rewritten or retroactively certified. Unfinished legacy signature entries without authenticated signer IDs require fresh acknowledgements.
- Creator saves are draft-only; once sent, changes must use Messages actions. Counter-offers require fresh approval/signatures for the new proposal while retaining earlier proposal history.
- Finalized parent records cannot be edited or deleted, including through cascading account deletion. Delivery-status bookkeeping is allowed without changing the signed document. Account deletion/retention needs an explicit workflow before public beta.

## References

- [Vercel Vite SPA configuration](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel write-only Secret environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [Vercel deployment authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Supabase function-execution advisor](https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0028_anon_security_definer_function_executable)
- [Supabase auth redirects](https://supabase.com/docs/guides/auth/redirect-urls)
