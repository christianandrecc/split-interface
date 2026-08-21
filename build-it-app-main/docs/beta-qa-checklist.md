# SPLIT Beta QA Checklist

Use this before sharing a new beta build. The command covers automated checks; the manual flow catches real Supabase, auth, and Vercel behavior.

## Automated Gate

Run from the app root:

```bash
npm run verify:beta
```

This verifies account/profile storage, split-sheet isolation, send/update persistence, Messages negotiation, signing, notifications, search, migrations, RLS coverage, and the production build.

## Manual Two-Account Flow

1. Create or sign in to Account A.
2. Create or sign in to Account B in a separate browser/profile.
3. From Account A, create a split sheet with Account B invited by exact `@username` or email.
4. Confirm the split appears in Account A Messages and Split Sheets.
5. Confirm the split appears in Account B Messages after refresh.
6. From Account B, accept the invite, send a chat message, and accept or counter the proposal.
7. From Account A, confirm the chat message and proposal state update.
8. When all parties accept, sign from Account A and Account B.
9. Confirm the split becomes fully signed/verified for both accounts.
10. Confirm Dashboard cards, quick access, top-right notifications, and global search all point to the same split.

## Supabase Spot Checks

- `profiles`: one row per signed-up auth user, with public fields and private account fields saved.
- `split_sheets`: one row per created split sheet, with `creator_user_id` matching the creator's auth user.
- `split_sheet_collaborators`: invited parties link to `collaborator_user_id` after the invited account exists.
- `split_sheet_responses`: accept, reject, counter, and sign actions are recorded.
- `split_sheet_audit_records`: messages are readable event summaries, not raw JSON payloads.
- `split_notifications`: new split invites, messages, proposal updates, and signatures create notifications for the right user.

## Release Rule

Do not call a build beta-ready if any of these fail:

- A sent split disappears after opening Messages.
- A recreated account sees old split sheets from a deleted auth user.
- A collaborator can see or sign a split they were not invited to.
- A send/sign/counter action only saves locally.
- The production Vercel URL serves an older bundle than the latest pushed commit.
