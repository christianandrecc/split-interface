import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260820224500_split_sheet_rls_hardening.sql"),
  "utf8",
);

const splitSheetStorageSource = readFileSync(
  resolve(process.cwd(), "src/lib/splitSheetStorage.ts"),
  "utf8",
);

describe("Supabase RLS hardening", () => {
  it("keeps split-sheet writes behind RPCs instead of direct table writes", () => {
    expect(splitSheetStorageSource).toContain('supabase.rpc("upsert_split_sheet_document"');
    expect(splitSheetStorageSource).toContain('supabase.rpc("apply_split_sheet_participant_update"');
    expect(splitSheetStorageSource).not.toMatch(/\.from\(["']split_sheet/);
    expect(splitSheetStorageSource).not.toMatch(/\.from\(["']split_sheets/);
  });

  it("removes direct browser write policies while preserving the public RPC surface", () => {
    expect(migration).toContain('drop policy if exists "split sheet creators can insert"');
    expect(migration).toContain('drop policy if exists "split sheet creators can update"');
    expect(migration).toContain('drop policy if exists "split creators manage collaborators"');
    expect(migration).toContain('drop policy if exists "split participants can respond"');
    expect(migration).toContain("revoke insert, update, delete on public.split_sheets from anon, authenticated");
    expect(migration).toContain("revoke insert, update, delete on public.split_notifications from anon, authenticated");
    expect(migration).toContain("grant execute on function public.upsert_split_sheet_document(jsonb, text, text) to authenticated");
    expect(migration).toContain("grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated");
  });

  it("removes broad maintenance RPCs from authenticated browser clients", () => {
    expect(migration).toContain("revoke execute on function public.resolve_all_pending_split_sheet_collaborators() from public, anon, authenticated");
    expect(migration).toContain("revoke execute on function public.notify_split_sheet_event(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated");
  });
});
