# Workspace Dashboard

The dashboard uses the existing authenticated Supabase integration. No new tables, migrations, policies, Edge Functions, API keys, or dependencies are required for this layout.

## Where To Make Changes

- `src/components/Dashboard.tsx`: shared navigation, account menu, global search, loading/refresh, and existing screen callbacks.
- `src/components/WorkspaceOverview.tsx`: workspace counters, filters, records, recent activity, and private guide.
- `src/components/workspace.css`: scoped layout and responsive styling.
- `src/lib/workspaceOverview.ts`: pure display mapping, current-proposal ownership, viewer-aware actions, filtering, sorting, and activity selection.
- `src/lib/splitSheetStorage.ts`: existing Supabase persistence boundary. Its optional load-error callback lets the dashboard show a retry state without changing other callers.

## Supabase Data Flow

1. `load_my_split_sheets` supplies participant-authorized document payloads through `loadSplitSheetDocuments`.
2. `documentToAgreement` normalizes those payloads. The overview reads the selected proposal's allocations, not stale initial percentages.
3. Row actions open the existing Messages or AgreementDetail components. Accepting, countering, and signing continue through the existing participant RPCs; the overview never writes those decisions itself.
4. Notifications continue through `load_my_split_notifications`, `mark_split_notifications_read`, and the existing notification subscription. Older records fall back to sanitized audit entries, excluding internal chat payloads.
5. The dashboard refreshes on focus, visibility, and the existing 30-second interval. Failed refreshes show a retry banner and retain the current account's last available records. Switching accounts clears the previous account's workspace.

Keep database status values unchanged. The overview renders signed terminal states as `Signed`; that is a presentation label, not a new database enum. Archived records remain distinct. Draft rows open the existing draft record; this change does not add draft resumption to the builder.

The private guide is a local, read-only workspace overview with navigation actions. It does not call an AI service, send messages, suggest percentages, or modify split terms.

## Validation

Run `npm test` and `npm run build`. Focused tests are `workspaceOverview.test.ts`, `workspaceOverviewView.test.tsx`, and the dashboard integration suites.

Browser QA exercised real rendered components with isolated Supabase responses, including accepting an invite and generating the actual PDF. No live database writes were performed. Live authenticated production permissions and external contract delivery were not re-verified by this UI change.
