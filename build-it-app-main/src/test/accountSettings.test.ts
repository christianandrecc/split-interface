import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_SETTINGS, loadAccountSettings, saveAccountSettings, validateAccountSettings } from "@/lib/accountSettings";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn(), update: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }));
const row = { user_id: "account-a", default_split_method: "Custom", default_territory: "Worldwide", default_user_role: "Songwriter", include_audit_trail: true, revision: 1, updated_at: "2026-09-11T00:00:00Z" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "account-a" } }, error: null });
  for (const method of [mocks.from, mocks.select, mocks.eq, mocks.insert, mocks.update]) method.mockReturnValue(mocks);
  mocks.maybeSingle.mockResolvedValue({ data: row, error: null });
});
describe("account settings storage", () => {
  it("returns defaults without creating a row for an account without settings", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await loadAccountSettings("account-a")).toEqual({ settings: DEFAULT_APP_SETTINGS, revision: null });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("reads only the verified account's settings", async () => {
    expect((await loadAccountSettings("account-a")).revision).toBe(1);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "account-a");
    mocks.from.mockClear();
    await expect(loadAccountSettings("account-b")).rejects.toThrow(/account changed/);
    await expect(saveAccountSettings("account-b", DEFAULT_APP_SETTINGS, null)).rejects.toThrow(/account changed/);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("inserts only supported allowlisted fields on first save", async () => {
    await saveAccountSettings("account-a", { ...DEFAULT_APP_SETTINGS, defaultTerritory: "  Canada  " }, null);
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: "account-a", default_split_method: "Custom", default_territory: "Canada", default_user_role: "Songwriter", include_audit_trail: true });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("updates with a revision precondition and treats zero rows as a conflict", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(saveAccountSettings("account-a", DEFAULT_APP_SETTINGS, 3)).rejects.toThrow(/another tab/);
    expect(mocks.eq).toHaveBeenCalledWith("revision", 3);
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("user_id");
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("revision");
  });
  it("does not fall back after missing schema, connection errors or a first-save race", async () => {
    for (const [code, message] of [["23505", /another tab/], ["42P01", /migration/], ["PGRST205", /migration/], ["NETWORK", /connection/]] as const) {
      mocks.maybeSingle.mockResolvedValue({ data: null, error: { code, message: "Failure" } });
      await expect(saveAccountSettings("account-a", DEFAULT_APP_SETTINGS, null)).rejects.toThrow(message);
      if (code !== "23505") await expect(loadAccountSettings("account-a")).rejects.toThrow(message);
    }
  });
  it("rejects invalid roles, territories and server rows", async () => {
    expect(() => validateAccountSettings({ ...DEFAULT_APP_SETTINGS, defaultUserRole: "Engineer" as never })).toThrow();
    expect(() => validateAccountSettings({ ...DEFAULT_APP_SETTINGS, defaultSplitMethod: "Role-based" as never })).toThrow();
    for (const defaultTerritory of [" ", "a".repeat(101)]) expect(() => validateAccountSettings({ ...DEFAULT_APP_SETTINGS, defaultTerritory })).toThrow(/territory/);
    mocks.maybeSingle.mockResolvedValue({ data: { ...row, user_id: "account-b" }, error: null });
    await expect(loadAccountSettings("account-a")).rejects.toThrow(/verify/);
  });
});
