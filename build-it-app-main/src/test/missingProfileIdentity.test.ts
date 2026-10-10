import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAndLoadSupabaseProfile } from "@/lib/profileStorage";

const mock = vi.hoisted(() => ({ user: { id: "isolated-user", email: "not-a-legal-name@example.test", user_metadata: {} as Record<string, unknown> }, stored: null as unknown, saved: null as Record<string, unknown> | null }));
vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { signInWithPassword: vi.fn(async () => ({ data: { user: mock.user }, error: null })) },
    from: () => {
      const query = {
        select: () => query, eq: () => query,
        maybeSingle: async () => ({ data: mock.stored, error: null }),
        upsert: (row: Record<string, unknown>) => { mock.saved = row; return query; },
        single: async () => ({ data: mock.saved, error: null }),
      };
      return query;
    },
  },
}));

beforeEach(() => { mock.stored = null; mock.saved = null; mock.user.user_metadata = {}; });
describe("missing-profile sign-in identity", () => {
  it("does not manufacture legal identity from the contact email", async () => {
    const result = await signInAndLoadSupabaseProfile(mock.user.email, "synthetic-test-password");
    expect(result.profile.legalName).toBe(""); expect(result.profile.legalFirstName).toBe("");
    expect(mock.saved?.legal_name).toBeNull();
    expect(result.profile.authUserId).toBe(mock.user.id);
    expect(result.profile.emailAddress).toBe(mock.user.email);
  });
  it("retains explicitly supplied signup legal metadata", async () => {
    mock.user.user_metadata = { username: "artist", legal_name: "Supplied Legal Name" };
    const result = await signInAndLoadSupabaseProfile(mock.user.email, "synthetic-test-password");
    expect(result.profile.legalName).toBe("Supplied Legal Name");
    expect(mock.saved?.legal_name).toBe("Supplied Legal Name");
  });
});
