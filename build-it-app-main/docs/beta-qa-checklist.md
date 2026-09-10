# SPLIT Beta QA Checklist

Use this before sharing a new beta build. The command covers automated checks; the manual flow catches real Supabase, auth, and Vercel behavior.

## Automated Gate

Run from the app root:

```bash
npm run verify:deploy
```

This checks environment variables, types, lint, all UI/unit tests, the build, dependencies, and disposable PostgreSQL checks. It passes locally with the signing/permission migrations. The automated database check never connects to live Supabase. On September 10, 2026 both migrations were separately applied to the existing SPLIT project and a rollback-only hosted database smoke test passed; real browser sessions and Auth email links still need the manual checks below.

## Manual Two-Account Flow

1. Create or sign in to Account A.
2. Create or sign in to Account B in a separate browser/profile.
3. From Account A, create a split sheet with Account B invited by exact `@username` or email.
4. Confirm the split appears in Account A Messages and Split Sheets.
5. Confirm the split appears in Account B Messages after refresh.
6. From Account B, accept the invite, send a chat message, and accept or counter the proposal.
7. From Account A, confirm the chat message and proposal state update.
8. When all parties accept, sign from Account A and Account B.
9. Confirm Signed appears only after both authenticated users sign the same approved proposal.
10. Confirm the dashboard table, four status filters, notifications, and global search point to the same split.
11. Confirm Download SPLIT exports the new PDF with correct legal names, shares, signatures, details, and history.
12. Verify an unrelated Account C cannot load or modify the split, including through direct API requests.
13. Open the same proposal in both accounts, sign in one, then sign from the stale tab. Confirm a refresh is required, and the first signature is preserved after refreshing and signing. Verify finalized records reject every edit, including message writes.
14. Test confirmation/reset links on the hosted domain. Test invitation emails only after a real delivery worker is configured.

## Supabase Spot Checks

- `profiles`: one row per signed-up auth user, with public fields and private account fields saved.
- `split_sheets`: one row per created split sheet, with `creator_user_id` matching the creator's auth user.
- `split_sheet_collaborators`: invited parties link to `collaborator_user_id` after the invited account exists.
- `split_sheet_responses`: accept, reject, counter, and sign actions are recorded.
- `server_revision`: increases once per successful write; clients return the unchanged value on their next action.
- Signed entries contain the authenticated `signerUserId`, server timestamp, and the legal name captured from that account's profile. Finalization requires every party's approval and signature on the current proposal.
- `split_sheet_audit_records`: messages are readable event summaries, not raw JSON payloads.
- `split_notifications`: new split invites, messages, proposal updates, and signatures create notifications for the right user.

## Release Rule

Do not call a build beta-ready if any of these fail:

- A sent split disappears after opening Messages.
- A recreated account sees old split sheets from a deleted auth user.
- A collaborator can see or sign a split they were not invited to.
- A participant can alter another person's signature or finalize without every required signature.
- A finalized split can be changed through an API request, even with a read-only UI.
- A send/sign/counter action only saves locally.
- The production Vercel URL serves an older bundle than the latest pushed commit.

## Migration Rollout

The permission migration and `20260910220712_enforce_split_signature_ownership.sql` were applied to the existing SPLIT backend on September 10, 2026 with user approval. Remote migration history matches the local files. Require testers to refresh old tabs; older clients without `serverRevision` are intentionally rejected. Existing split-sheet content checksums were unchanged after migration and after the rollback-only hosted smoke test.

Unfinished legacy records with client-authored signatures lacking `signerUserId` request fresh acknowledgements. Existing finalized records are preserved without claiming retroactive identity verification. Signed records cannot be edited or deleted through the app; the database guard also prevents cascading deletion of the signed parent record. Review account-deletion/retention handling separately before public beta.
