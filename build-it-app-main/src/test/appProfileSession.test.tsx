import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { profileSessionMatchesSignIn } from "@/lib/profileSessionCache";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import { supabase } from "@/integrations/supabase/client";

const mocks = vi.hoisted(() => ({
  createSupabaseAccountProfile: vi.fn(),
  loadProfileSessionForActiveSession: vi.fn(),
  requestSupabasePasswordReset: vi.fn(),
  saveSupabaseProfile: vi.fn(),
  signInAndLoadSupabaseProfile: vi.fn(),
  updateSupabasePassword: vi.fn(),
}));

vi.mock("@/pages/Index", () => ({
  default: ({ userProfile, onUpdateProfile }: { userProfile: UserProfile; onUpdateProfile: (profile: UserProfile) => Promise<void> }) => (
    <main>
      <h1>Your Profile</h1>
      <p>{userProfile.displayName}</p>
      <p>{userProfile.emailAddress}</p>
      <button onClick={() => void onUpdateProfile({ ...userProfile, displayName: "Edited Artist", emailAddress: "unconfirmed@example.com" }).catch(() => {})}>Save profile</button>
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

function markOnboardingComplete(identity: string) {
  window.localStorage.setItem(`split.newUserOnboarding.v1:${identity}`, "complete");
}

describe("App profile session loading", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("does not publish or cache failed profile edits", async () => {
    const profile = makeProfile({ displayName: "Saved Artist", emailAddress: "saved@example.com" });
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile });
    mocks.saveSupabaseProfile.mockRejectedValue(new Error("Offline"));
    markOnboardingComplete("current-user");
    render(<App />);
    await screen.findByText("Saved Artist");
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(mocks.saveSupabaseProfile).toHaveBeenCalledOnce());
    expect(screen.queryByText("Edited Artist")).not.toBeInTheDocument();
    expect(screen.queryByText("unconfirmed@example.com")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("split.userProfileSession.v1")!).profile.emailAddress).toBe(profile.emailAddress);
  });

  it("refreshes the active Auth email and cache after returning from confirmation", async () => {
    const profile = makeProfile({ displayName: "Saved Artist", emailAddress: "old@example.com" });
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile });
    markOnboardingComplete("current-user");
    render(<App />);
    await screen.findByText("old@example.com");
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: { id: "current-user", email: "confirmed@example.com", user_metadata: { email: "stale@example.com" } } }, error: null } as never);
    fireEvent(window, new Event("focus"));
    await screen.findByText("confirmed@example.com");
    expect(JSON.parse(localStorage.getItem("split.userProfileSession.v1")!).profile.emailAddress).toBe("confirmed@example.com");
    expect(mocks.saveSupabaseProfile).not.toHaveBeenCalled();
  });

  it("ignores email refreshes belonging to another account", async () => {
    const profile = makeProfile({ displayName: "Saved Artist", emailAddress: "old@example.com" });
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile });
    markOnboardingComplete("current-user");
    render(<App />);
    await screen.findByText("old@example.com");
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: { id: "different-user", email: "other@example.com" } }, error: null } as never);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalled());
    expect(screen.queryByText("other@example.com")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("split.userProfileSession.v1")!).profile.emailAddress).toBe("old@example.com");
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

    markOnboardingComplete("maya-user-id");
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
    expect(cachedSession.profile.authUserId).toBe("maya-user-id");
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

  it("can recognize whether cached sign-in data belongs to the same Supabase user id", () => {
    const cachedSession = {
      userId: "old-auth-user",
      profile: makeProfile({
        displayName: "Old Chori",
        emailAddress: "chori@example.com",
        phoneNumber: "216-555-1212",
      }),
    };

    expect(profileSessionMatchesSignIn(cachedSession, "old-auth-user", "chori@example.com")).toBe(true);
    expect(profileSessionMatchesSignIn(cachedSession, "new-auth-user", "chori@example.com")).toBe(false);
    expect(profileSessionMatchesSignIn(cachedSession, "old-auth-user", "other@example.com")).toBe(false);
  });

  it("does not overwrite the Supabase profile with stale cached data during sign-in", async () => {
    const staleProfile = makeProfile({
      username: "old-chori",
      displayName: "Old Chori",
      emailAddress: "chori@example.com",
      legalName: "Old Legal Name",
      phoneNumber: "216-555-1212",
      roleTags: "Producer",
    });
    const supabaseProfile = makeProfile({
      username: "fresh-chori",
      displayName: "Fresh Chori",
      emailAddress: "chori@example.com",
      legalName: "Fresh Legal Name",
      roleTags: "Writer",
    });

    window.localStorage.setItem(
      "split.userProfileSession.v1",
      JSON.stringify({ userId: "same-auth-user", profile: staleProfile }),
    );
    mocks.loadProfileSessionForActiveSession.mockResolvedValue(null);
    mocks.signInAndLoadSupabaseProfile.mockResolvedValue({
      profile: supabaseProfile,
      saved: true,
      userId: "same-auth-user",
    });

    markOnboardingComplete("same-auth-user");
    render(<App />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Personal information" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    fireEvent.change(screen.getByRole("textbox", { name: /email address/i }), {
      target: { value: "chori@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" }).at(-1)!);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Your Profile" })).toBeInTheDocument());
    expect(screen.getByText("Fresh Chori")).toBeInTheDocument();
    expect(screen.queryByText("Old Chori")).not.toBeInTheDocument();
    expect(mocks.saveSupabaseProfile).not.toHaveBeenCalled();

    const cachedSession = JSON.parse(window.localStorage.getItem("split.userProfileSession.v1") ?? "{}");
    expect(cachedSession.userId).toBe("same-auth-user");
    expect(cachedSession.profile.authUserId).toBe("same-auth-user");
    expect(cachedSession.profile.displayName).toBe("Fresh Chori");
  });
});
