import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAccountEmail, requestAccountEmailChange, resendAccountEmailChange } from "@/lib/accountEmail";
import { consumeSupabaseAuthCallbackFromUrl, loadProfileSessionForActiveSession, profileFromAuthUserMetadataForTest, requestSignupConfirmation, requestSupabasePasswordReset, saveSupabaseProfile } from "@/lib/profileStorage";
import { createEmptyProfile } from "@/lib/userProfile";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), resend: vi.fn(), resetPasswordForEmail: vi.fn(),
  exchangeCodeForSession: vi.fn(), setSession: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), upsert: vi.fn(), single: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabase: {
  auth: mocks, from: mocks.from,
} }));
const user = { id: "account-a", email: "current@example.test", new_email: "", user_metadata: { display_name: "Artist", email: "stale@example.test", profile_data: { emailAddress: "stale-payload@example.test" } } };
const pending = { ...user, new_email: "new@example.test" };
const profile = { ...createEmptyProfile(), authUserId: user.id, displayName: "Artist", emailAddress: user.email };
const row = { user_id: user.id, display_name: profile.displayName, email: user.email, profile_data: profile };
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/");
  for (const method of [mocks.from, mocks.select, mocks.eq, mocks.upsert]) method.mockReturnValue(mocks);
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.updateUser.mockResolvedValue({ data: { user: pending }, error: null });
  mocks.resend.mockResolvedValue({ data: {}, error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: row, error: null });
  mocks.single.mockResolvedValue({ data: row, error: null });
});

describe("account email authority", () => {
  it("uses Auth email instead of stale or editable metadata", () => {
    expect(profileFromAuthUserMetadataForTest(user)?.emailAddress).toBe(user.email);
    expect(profileFromAuthUserMetadataForTest({ ...user, email: null })?.emailAddress).toBe("");
  });
  it.each([user, { ...user, user_metadata: {} }])("loads the Auth email over mismatched stored profile data", async authUser => {
    mocks.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { ...row, email: "wrong@example.test", profile_data: { ...profile, emailAddress: "wrong@example.test" } }, error: null });
    expect((await loadProfileSessionForActiveSession())?.profile.emailAddress).toBe(user.email);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("ordinary saves keep the active email even with an old or pending email in the form", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: pending }, error: null });
    await saveSupabaseProfile({ ...profile, emailAddress: pending.new_email });
    expect(mocks.upsert.mock.calls[0][0]).toMatchObject({ email: user.email, profile_data: { emailAddress: user.email } });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("blocks cross-account saves and email requests before writing", async () => {
    await expect(saveSupabaseProfile({ ...profile, authUserId: "account-b" })).rejects.toThrow(/account changed/);
    await expect(requestAccountEmailChange("account-b", pending.new_email)).rejects.toThrow(/account changed/);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("fails closed without a verified user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(loadAccountEmail(user.id)).rejects.toThrow(/session expired/);
    await expect(requestAccountEmailChange(user.id, pending.new_email)).rejects.toThrow(/session expired/);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});

describe("email change lifecycle", () => {
  it("requests confirmation without writing profiles or replacing the current email", async () => {
    expect(await requestAccountEmailChange(user.id, "  New@Example.test ")).toEqual({ userId: user.id, email: user.email, pendingEmail: pending.new_email });
    expect(mocks.updateUser).toHaveBeenCalledWith({ email: pending.new_email }, { emailRedirectTo: "https://split-interface.vercel.app/" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("restores pending state from Auth and clears it only after Auth confirms the new email", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: pending }, error: null });
    expect((await loadAccountEmail(user.id)).pendingEmail).toBe(pending.new_email);
    mocks.getUser.mockResolvedValue({ data: { user: { ...user, email: pending.new_email } }, error: null });
    expect(await loadAccountEmail(user.id)).toEqual({ userId: user.id, email: pending.new_email, pendingEmail: null });
  });
  it("supports a server that completes the change immediately without inventing a pending state", async () => {
    mocks.updateUser.mockResolvedValue({ data: { user: { ...user, email: pending.new_email } }, error: null });
    expect((await requestAccountEmailChange(user.id, pending.new_email)).pendingEmail).toBeNull();
  });
  it("rejects invalid, unchanged and already pending addresses without sending", async () => {
    for (const email of ["", "invalid", "a b@example.test", "a".repeat(255) + "@example.test", " CURRENT@example.test "]) {
      await expect(requestAccountEmailChange(user.id, email)).rejects.toThrow();
    }
    mocks.getUser.mockResolvedValue({ data: { user: pending }, error: null });
    await expect(requestAccountEmailChange(user.id, pending.new_email)).rejects.toThrow(/already awaiting/);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("resends using the current address and skips sends after confirmation", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: pending }, error: null });
    await resendAccountEmailChange(user.id);
    expect(mocks.resend).toHaveBeenCalledWith({ type: "email_change", email: user.email, options: { emailRedirectTo: "https://split-interface.vercel.app/" } });
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    await resendAccountEmailChange(user.id);
    expect(mocks.resend).toHaveBeenCalledTimes(1);
  });
  it.each(["over_email_send_rate_limit", "over_request_rate_limit", "email_exists", "network"])("reports %s without claiming success", async code => {
    mocks.updateUser.mockResolvedValue({ data: { user: null }, error: { code } });
    await expect(requestAccountEmailChange(user.id, pending.new_email)).rejects.toThrow(/wait|Could not/);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects mismatched or unacknowledged responses", async () => {
    for (const result of [null, { ...pending, id: "account-b" }, user]) {
      mocks.updateUser.mockResolvedValue({ data: { user: result }, error: null });
      await expect(requestAccountEmailChange(user.id, pending.new_email)).rejects.toThrow();
    }
  });
  it("routes password reset requests to the entered sign-in address without updating a profile", async () => {
    await requestSupabasePasswordReset(" Current@Example.test ");
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(user.email, { redirectTo: "https://split-interface.vercel.app/" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("signup confirmation requests", () => {
  it("requests a signup resend without claiming delivery or exposing account status", async () => {
    expect(await requestSignupConfirmation(" New@Example.test ")).toEqual({ requested: true });
    expect(mocks.resend).toHaveBeenCalledWith({ type: "signup", email: "new@example.test", options: { emailRedirectTo: "https://split-interface.vercel.app/" } });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it.each(["", "invalid", "a b@example.test", "a".repeat(255) + "@example.test"])("rejects invalid email %s before sending", async email => {
    await expect(requestSignupConfirmation(email)).rejects.toThrow(/valid email/);
    expect(mocks.resend).not.toHaveBeenCalled();
  });
  it.each([
    ["over_email_send_rate_limit", /wait a minute/],
    ["over_request_rate_limit", /wait a minute/],
    ["email_address_not_authorized", /delivery is unavailable/],
    ["network", /Could not request/],
  ])("reports %s without a false success", async (code, message) => {
    mocks.resend.mockResolvedValue({ data: {}, error: { code } });
    await expect(requestSignupConfirmation("new@example.test")).rejects.toThrow(message);
  });
});

describe("Auth email confirmation callbacks", () => {
  it("consumes PKCE callbacks and removes the code from the URL", async () => {
    window.history.replaceState({}, "", "/?code=confirmation-code");
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    expect(await consumeSupabaseAuthCallbackFromUrl()).toBe(true);
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("confirmation-code");
    expect(window.location.search).toBe("");
  });
  it("consumes implicit email-change callbacks", async () => {
    window.history.replaceState({}, "", "/#access_token=access&refresh_token=refresh&type=email_change");
    mocks.setSession.mockResolvedValue({ error: null });
    expect(await consumeSupabaseAuthCallbackFromUrl()).toBe(true);
    expect(mocks.setSession).toHaveBeenCalledWith({ access_token: "access", refresh_token: "refresh" });
    expect(window.location.hash).toBe("");
  });
  it.each(["?error=access_denied", "#error=access_denied&error_description=Link+expired"])("surfaces failed confirmation callbacks: %s", async suffix => {
    window.history.replaceState({}, "", "/" + suffix);
    await expect(consumeSupabaseAuthCallbackFromUrl()).rejects.toThrow(/access_denied|Link expired/);
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(window.location.search + window.location.hash).toBe("");
  });
});
