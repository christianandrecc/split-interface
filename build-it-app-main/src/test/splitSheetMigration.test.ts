import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812120000_split_sheet_workflow.sql"),
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
});
