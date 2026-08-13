import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812120000_split_sheet_workflow.sql"),
  "utf8",
);
const participantRoutingSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260813122000_split_sheet_participant_routing.sql"),
  "utf8",
);
const globalSearchSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260813133000_global_search.sql"),
  "utf8",
);

describe("split sheet Supabase migration", () => {
  it("creates the core workflow tables", () => {
    expect(migrationSql).toContain("create table if not exists public.split_sheets");
    expect(migrationSql).toContain("create table if not exists public.split_sheet_collaborators");
    expect(migrationSql).toContain("create table if not exists public.split_sheet_proposal_versions");
    expect(migrationSql).toContain("create table if not exists public.split_sheet_responses");
    expect(migrationSql).toContain("create table if not exists public.split_sheet_audit_records");
  });

  it("enforces exact 100 percent ownership and collaborator percentage bounds", () => {
    expect(migrationSql).toContain("split_sheets_total_check");
    expect(migrationSql).toContain("check (split_total = 100)");
    expect(migrationSql).toContain("split_sheet_collaborators_percentage_check");
    expect(migrationSql).toContain("check (percentage >= 0 and percentage <= 100)");
  });

  it("enables RLS with creator and participant access helpers", () => {
    expect(migrationSql).toContain("alter table public.split_sheets enable row level security");
    expect(migrationSql).toContain("alter table public.split_sheet_collaborators enable row level security");
    expect(migrationSql).toContain("public.is_split_sheet_participant");
    expect(migrationSql).toContain("public.is_split_sheet_creator");
    expect(migrationSql).toContain("split sheets participants can view");
    expect(migrationSql).toContain("split sheet creators can update");
  });

  it("keeps contract delivery queued for server-side services", () => {
    expect(migrationSql).toContain("create table if not exists public.split_sheet_contract_deliveries");
    expect(migrationSql).toContain("provider text not null default 'supabase_edge_function_placeholder'");
    expect(migrationSql).toContain("split contract creators can queue delivery");
  });

  it("links collaborator invites to SPLIT accounts without exposing lookup data", () => {
    expect(migrationSql).toContain("create or replace function public.resolve_split_invite_user_id");
    expect(migrationSql).toContain("revoke all on function public.resolve_split_invite_user_id");
    expect(migrationSql).toContain("create trigger set_split_collaborator_user_id");
    expect(migrationSql).toContain("create trigger link_pending_split_invites_for_profile");
    expect(migrationSql).toContain("grant execute on function public.resolve_split_sheet_collaborators");
  });

  it("allows participants to persist accept, reject, counter, and signature responses through RPC", () => {
    expect(migrationSql).toContain("create or replace function public.apply_split_sheet_participant_update");
    expect(migrationSql).toContain("if not (select public.is_split_sheet_participant");
    expect(migrationSql).toContain("Unsupported split-sheet action");
    expect(migrationSql).toContain("Accept the collaboration invite before responding to the split.");
    expect(migrationSql).toContain("Ownership percentages must total exactly 100");
    expect(migrationSql).toContain("insert into public.split_sheet_responses");
    expect(migrationSql).toContain("grant execute on function public.apply_split_sheet_participant_update");
  });

  it("adds a current-user split-sheet loader for creators and invited collaborators", () => {
    expect(participantRoutingSql).toContain("create or replace function public.load_my_split_sheets");
    expect(participantRoutingSql).toContain("sheet.creator_user_id = (select auth.uid())");
    expect(participantRoutingSql).toContain("collaborator.collaborator_user_id = (select auth.uid())");
    expect(participantRoutingSql).toContain("and (sheet.status <> 'Draft' or sheet.sent_at is not null)");
    expect(participantRoutingSql).toContain("grant execute on function public.load_my_split_sheets() to authenticated");
  });

  it("backfills pending split-sheet invites by username, email, and phone", () => {
    expect(participantRoutingSql).toContain("create or replace function public.resolve_all_pending_split_sheet_collaborators");
    expect(participantRoutingSql).toContain("lower(trim(both '@' from collaborator.username))");
    expect(participantRoutingSql).toContain("lower(coalesce(collaborator.invite_email, collaborator.invite_value)) = lower(new.email)");
    expect(participantRoutingSql).toContain("right(public.split_invite_digits");
    expect(participantRoutingSql).toContain("select public.resolve_all_pending_split_sheet_collaborators()");
  });

  it("links creator collaborator rows to the creator auth user", () => {
    expect(participantRoutingSql).toContain("if new.invite_method = 'creator' and new.collaborator_user_id is null");
    expect(participantRoutingSql).toContain("select sheet.creator_user_id");
    expect(participantRoutingSql).toContain("before insert or update of username, invite_email, invite_phone, invite_value, invite_method, collaborator_user_id");
  });

  it("keeps relational collaborator and proposal rows synced during participant actions", () => {
    expect(participantRoutingSql).toContain("create or replace function public.sync_split_sheet_proposals_from_payload");
    expect(participantRoutingSql).toContain("create or replace function public.sync_split_sheet_collaborators_from_payload");
    expect(participantRoutingSql).toContain("perform public.sync_split_sheet_proposals_from_payload");
    expect(participantRoutingSql).toContain("perform public.sync_split_sheet_collaborators_from_payload");
    expect(participantRoutingSql).toContain("on conflict (id) do update");
    expect(participantRoutingSql).toContain("signature_status = coalesce(signature.signature_status");
  });

  it("adds public-safe profile search for the dashboard search bar", () => {
    expect(globalSearchSql).toContain("create or replace function public.search_split_profiles");
    expect(globalSearchSql).toContain("returns table");
    expect(globalSearchSql).toContain("user_id uuid");
    expect(globalSearchSql).toContain("username text");
    expect(globalSearchSql).toContain("display_name text");
    expect(globalSearchSql).toContain("role_tags text");
    expect(globalSearchSql).toContain("profile_image_url text");
    expect(globalSearchSql).toContain("profile_location text");
    expect(globalSearchSql).toContain("lower(coalesce(profile.email, '')) = normalized.query_text");
    expect(globalSearchSql).toContain("lower(coalesce(profile.profile_visibility, 'public')) <> 'private'");
    expect(globalSearchSql).toContain("revoke all on function public.search_split_profiles");
    expect(globalSearchSql).toContain("grant execute on function public.search_split_profiles(text, integer) to authenticated");
    expect(globalSearchSql).not.toContain("phone_number text");
    expect(globalSearchSql).not.toContain("legal_name text");
    expect(globalSearchSql).not.toContain("pro_affiliation text");
    expect(globalSearchSql).not.toContain("ipi_number text");
    expect(globalSearchSql).not.toContain("tax_id text");
  });
});
