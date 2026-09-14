import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  default: ({ userProfile, onUpdateProfile, onSignOut, signingOut }: { userProfile: UserProfile; onUpdateProfile: (profile: UserProfile) => Promise<void>; onSignOut: () => Promise<void>; signingOut: boolean }) => (
    <main>
      <h1>Your Profile</h1>
      <p>{userProfile.displayName}</p>
      <p>{userProfile.emailAddress}</p>
      <button onClick={() => void onUpdateProfile({ ...userProfile, displayName: "Edited Artist", emailAddress: "unconfirmed@example.com" }).catch(() => {})}>Save profile</button>
      <button disabled={signingOut} onClick={() => void onSignOut()}>{signingOut ? "Signing out..." : "Sign out"}</button>
    </main>
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signOut: vi.fn(async () => ({ error: null })),
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

function emitAuth(event: string, userId: string | null) {
  act(() => {
    for (const [callback] of vi.mocked(supabase.auth.onAuthStateChange).mock.calls) {
      callback(event as never, userId ? { user: { id: userId } } as never : null);
    }
  });
}

describe("App profile session loading", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
  });

  it("routes a validated recovery session to password reset before the dashboard", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({
      userId: "current-user", profile: makeProfile({ displayName: "Recovery User" }), passwordRecovery: true,
    });
    markOnboardingComplete("current-user");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Create a new password" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your Profile" })).not.toBeInTheDocument();
    expect(mocks.updateSupabasePassword).not.toHaveBeenCalled();
  });

  it("does not offer to change a password after the recovery callback fails", async () => {
    window.history.replaceState({}, "", "/?type=recovery&error=access_denied");
    mocks.loadProfileSessionForActiveSession.mockRejectedValueOnce(new Error("Link expired"));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Personal information" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Create a new password" })).not.toBeInTheDocument();
    expect(mocks.updateSupabasePassword).not.toHaveBeenCalled();
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

  it("removes account data immediately when another tab signs out", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    markOnboardingComplete("current-user");
    render(<App />);
    await screen.findByText("Account A");
    emitAuth("SIGNED_OUT", null);
    expect(screen.queryByText("Account A")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign in to SPLIT" })).toBeInTheDocument();
    expect(window.localStorage.getItem("split.userProfileSession.v1")).toBeNull();
  });

  it("signs out the current session, clears profile caches, and allows a different account to sign in", async () => {
    const profile = makeProfile({ displayName: "Account A", emailAddress: "a@example.com" });
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile });
    markOnboardingComplete("current-user");
    markOnboardingComplete("account-b");
    let finish!: (value: { error: null }) => void;
    vi.mocked(supabase.auth.signOut).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "Signing out..." }));
    expect(supabase.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(screen.getByRole("button", { name: "Signing out..." })).toBeDisabled();
    await act(async () => finish({ error: null }));
    expect(screen.getByRole("heading", { name: "Sign in to SPLIT" })).toBeInTheDocument();
    expect(screen.queryByText("Account A")).not.toBeInTheDocument();
    expect(localStorage.getItem("split.userProfile.v6")).toBeNull();
    expect(localStorage.getItem("split.userProfileSession.v1")).toBeNull();
    mocks.signInAndLoadSupabaseProfile.mockResolvedValueOnce({ userId: "account-b", profile: makeProfile({ displayName: "Account B", emailAddress: "b@example.com" }) });
    fireEvent.change(screen.getByRole("textbox", { name: /email address/i }), { target: { value: "b@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "test-password-123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" }).at(-1)!);
    expect(await screen.findByText("Account B")).toBeInTheDocument();
    expect(screen.queryByText("Account A")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("split.userProfileSession.v1")!).userId).toBe("account-b");
  });

  it.each(["returned", "thrown"])("keeps the session after a %s sign-out error and allows retry", async (failure) => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    markOnboardingComplete("current-user");
    if (failure === "returned") vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: new Error("Offline") } as never);
    else vi.mocked(supabase.auth.signOut).mockRejectedValueOnce(new Error("Offline"));
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await screen.findByText("Could not sign out");
    expect(screen.getByText("Account A")).toBeInTheDocument();
    expect(localStorage.getItem("split.userProfileSession.v1")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in to SPLIT" })).toBeInTheDocument();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(2);
  });

  it("does not clear a newer account when an older sign-out promise finishes", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValueOnce({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    markOnboardingComplete("current-user");
    markOnboardingComplete("account-b");
    let finish!: (value: { error: null }) => void;
    vi.mocked(supabase.auth.signOut).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    emitAuth("SIGNED_OUT", null);
    mocks.loadProfileSessionForActiveSession.mockResolvedValueOnce({ userId: "account-b", profile: makeProfile({ displayName: "Account B" }) });
    emitAuth("SIGNED_IN", "account-b");
    await screen.findByText("Account B");
    await act(async () => finish({ error: null }));
    expect(screen.getByText("Account B")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("split.userProfileSession.v1")!).userId).toBe("account-b");
  });

  it("stays signed out if the SDK clears the local session before returning a server error", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    markOnboardingComplete("current-user");
    let finish!: (value: { error: Error }) => void;
    vi.mocked(supabase.auth.signOut).mockImplementationOnce(() => new Promise(resolve => { finish = resolve as typeof finish; }));
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    emitAuth("SIGNED_OUT", null);
    await act(async () => finish({ error: new Error("Server unavailable") }));
    expect(screen.getByRole("heading", { name: "Sign in to SPLIT" })).toBeInTheDocument();
    expect(await screen.findByText("Signed out on this browser")).toBeInTheDocument();
    expect(screen.queryByText("Account A")).not.toBeInTheDocument();
    expect(localStorage.getItem("split.userProfileSession.v1")).toBeNull();
  });

  it("clears the previous account before loading a new account from another tab", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValueOnce({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    markOnboardingComplete("current-user");
    markOnboardingComplete("other-user");
    render(<App />);
    await screen.findByText("Account A");
    let resolve!: (value: unknown) => void;
    mocks.loadProfileSessionForActiveSession.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    emitAuth("SIGNED_IN", "other-user");
    expect(screen.queryByText("Account A")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("split.userProfileSession.v1")).toBeNull();
    await waitFor(() => expect(mocks.loadProfileSessionForActiveSession).toHaveBeenCalledTimes(2));
    await act(async () => resolve({ userId: "other-user", profile: makeProfile({ displayName: "Account B" }) }));
    expect(await screen.findByText("Account B")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("split.userProfileSession.v1")!).userId).toBe("other-user");
  });

  it("does not restore a late startup response after sign-out", async () => {
    let resolve!: (value: unknown) => void;
    mocks.loadProfileSessionForActiveSession.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(<App />);
    emitAuth("SIGNED_OUT", null);
    await act(async () => resolve({ userId: "current-user", profile: makeProfile({ displayName: "Old account" }) }));
    expect(screen.queryByText("Old account")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("split.userProfileSession.v1")).toBeNull();
  });

  it("does not publish a profile-save response after the account signs out", async () => {
    const profile = makeProfile({ displayName: "Account A" });
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile });
    markOnboardingComplete("current-user");
    let resolve!: (value: unknown) => void;
    mocks.saveSupabaseProfile.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(<App />);
    await screen.findByText("Account A");
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    emitAuth("SIGNED_OUT", null);
    await act(async () => resolve({ ...profile, displayName: "Late save" }));
    expect(screen.queryByText("Late save")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("split.userProfileSession.v1")).toBeNull();
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

  it("clears a stale account discovered when the window regains focus", async () => {
    const profile = makeProfile({ displayName: "Saved Artist", emailAddress: "old@example.com" });
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile });
    markOnboardingComplete("current-user");
    render(<App />);
    await screen.findByText("old@example.com");
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: { id: "different-user", email: "other@example.com" } }, error: null } as never);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalled());
    expect(screen.queryByText("other@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("old@example.com")).not.toBeInTheDocument();
    expect(localStorage.getItem("split.userProfileSession.v1")).toBeNull();
  });

  it("clears the account when focus verification finds a missing Auth session", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    markOnboardingComplete("current-user");
    render(<App />);
    await screen.findByText("Account A");
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: null }, error: { name: "AuthSessionMissingError" } } as never);
    fireEvent(window, new Event("focus"));
    await screen.findByRole("heading", { name: "Sign in to SPLIT" });
    expect(screen.queryByText("Account A")).not.toBeInTheDocument();
    expect(localStorage.getItem("split.userProfileSession.v1")).toBeNull();
  });

  it("keeps the current screen for same-account token refresh and temporary verification failures", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValue({ userId: "current-user", profile: makeProfile({ displayName: "Account A", emailAddress: "a@example.com" }) });
    markOnboardingComplete("current-user");
    render(<App />);
    await screen.findByText("Account A");
    const saveButton = screen.getByRole("button", { name: "Save profile" });
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: null }, error: { name: "AuthRetryableFetchError" } } as never);
    emitAuth("TOKEN_REFRESHED", "current-user");
    await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Save profile" })).toBe(saveButton);
    expect(screen.getByText("a@example.com")).toBeInTheDocument();
    expect(mocks.loadProfileSessionForActiveSession).toHaveBeenCalledOnce();
  });

  it("ignores an older account load after a second account switch", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValueOnce({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    markOnboardingComplete("current-user");
    markOnboardingComplete("account-c");
    render(<App />);
    await screen.findByText("Account A");
    let resolveB!: (value: unknown) => void;
    mocks.loadProfileSessionForActiveSession.mockImplementationOnce(() => new Promise(done => { resolveB = done; }));
    emitAuth("SIGNED_IN", "account-b");
    mocks.loadProfileSessionForActiveSession.mockResolvedValueOnce({ userId: "account-c", profile: makeProfile({ displayName: "Account C" }) });
    emitAuth("SIGNED_IN", "account-c");
    await screen.findByText("Account C");
    await act(async () => resolveB({ userId: "account-b", profile: makeProfile({ displayName: "Account B" }) }));
    expect(screen.queryByText("Account B")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("split.userProfileSession.v1")!).userId).toBe("account-c");
  });

  it("preserves verified recovery when the SDK emits sign-in during callback loading", async () => {
    let resolve!: (value: unknown) => void;
    mocks.loadProfileSessionForActiveSession.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(<App />);
    emitAuth("SIGNED_IN", "current-user");
    await act(async () => resolve({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }), passwordRecovery: true }));
    await screen.findByRole("heading", { name: "Create a new password" });
    expect(mocks.loadProfileSessionForActiveSession).toHaveBeenCalledOnce();
  });

  it("keeps SDK password-recovery mode while loading a changed account", async () => {
    mocks.loadProfileSessionForActiveSession.mockResolvedValueOnce(null);
    render(<App />);
    await screen.findByRole("heading", { name: "Personal information" });
    mocks.loadProfileSessionForActiveSession.mockResolvedValueOnce({ userId: "current-user", profile: makeProfile({ displayName: "Account A" }) });
    emitAuth("PASSWORD_RECOVERY", "current-user");
    await screen.findByRole("heading", { name: "Create a new password" });
    expect(screen.queryByRole("heading", { name: "Your Profile" })).not.toBeInTheDocument();
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
