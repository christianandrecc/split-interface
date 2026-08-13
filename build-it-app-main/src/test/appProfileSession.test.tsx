import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";

const mocks = vi.hoisted(() => ({
  createSupabaseAccountProfile: vi.fn(),
  loadProfileSessionForActiveSession: vi.fn(),
  requestSupabasePasswordReset: vi.fn(),
  saveSupabaseProfile: vi.fn(),
  signInAndLoadSupabaseProfile: vi.fn(),
  updateSupabasePassword: vi.fn(),
}));

vi.mock("@/pages/Index", () => ({
  default: ({ userProfile }: { userProfile: UserProfile }) => (
    <main>
      <h1>Your Profile</h1>
      <p>{userProfile.displayName}</p>
      <p>{userProfile.emailAddress}</p>
    </main>
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "current-user" } }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    rpc: vi.fn(async () => ({ data: [], error: null })),
  },
}));

vi.mock("@/lib/profileStorage", () => ({
  createSupabaseAccountProfile: mocks.createSupabaseAccountProfile,
  isValidEmailAddress: (value?: string | null) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value ?? "").trim()),
  loadProfileSessionForActiveSession: mocks.loadProfileSessionForActiveSession,
  normalizeEmailAddress: (value?: string | null) => (value ?? "").trim().toLowerCase(),
  requestSupabasePasswordReset: mocks.requestSupabasePasswordReset,
  saveSupabaseProfile: mocks.saveSupabaseProfile,
  signInAndLoadSupabaseProfile: mocks.signInAndLoadSupabaseProfile,
  updateSupabasePassword: mocks.updateSupabasePassword,
}));

function makeProfile(overrides: Partial<UserProfile>) {
  return {
    ...createEmptyProfile(),
    ...overrides,
  };
}

describe("App profile session loading", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows the active Supabase user's profile instead of a stale cached profile", async () => {
    const staleProfile = makeProfile({
      username: "chori",
      displayName: "Chori",
      emailAddress: "chori@example.com",
    });
    const activeProfile = makeProfile({
      username: "maya",
      displayName: "Maya Rios",
      emailAddress: "maya@example.com",
    });

    window.localStorage.setItem("split.userProfile.v6", JSON.stringify(staleProfile));
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({
      userId: "maya-user-id",
      profile: activeProfile,
    });

    render(<App />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Your Profile" })).toBeInTheDocument());
    expect(screen.getByText("Maya Rios")).toBeInTheDocument();
    expect(screen.getByText("maya@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Chori")).not.toBeInTheDocument();
    expect(screen.queryByText("chori@example.com")).not.toBeInTheDocument();

    const cachedSession = JSON.parse(window.localStorage.getItem("split.userProfileSession.v1") ?? "{}");
    expect(cachedSession.userId).toBe("maya-user-id");
    expect(cachedSession.profile.emailAddress).toBe("maya@example.com");
  });

  it("clears stale cached profile data when Supabase has no active session", async () => {
    window.localStorage.setItem(
      "split.userProfile.v6",
      JSON.stringify(makeProfile({ displayName: "Old Account", emailAddress: "old@example.com" })),
    );
    mocks.loadProfileSessionForActiveSession.mockResolvedValue(null);

    render(<App />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Personal information" })).toBeInTheDocument());
    expect(screen.queryByText("Old Account")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("split.userProfile.v6")).toBeNull();
    expect(window.localStorage.getItem("split.userProfileSession.v1")).toBeNull();
  });
});
