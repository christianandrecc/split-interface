import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountAccessError, checkSignupUsername, createSupabaseAccountProfile, signInAndLoadSupabaseProfile } from "@/lib/profileStorage";
import { createEmptyProfile } from "@/lib/userProfile";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(), from: vi.fn(),
  select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabase: { ...mocks, auth: mocks } }));
const profile = { ...createEmptyProfile(), username: "new_artist", displayName: "New Artist", legalName: "Test Artist", emailAddress: "New@Example.test" };

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.signUp.mockResolvedValue({ data: { user: { id: "new-id" }, session: null }, error: null });
  for (const method of [mocks.from, mocks.select, mocks.eq, mocks.upsert]) method.mockReturnValue(mocks);
});

describe("signup and confirmation recovery", () => {
  it("blocks a taken username before sending a password or creating an account", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(createSupabaseAccountProfile(profile, "test-password")).rejects.toMatchObject({ code: "username_unavailable" });
    expect(mocks.rpc).toHaveBeenCalledWith("is_signup_username_available", { p_username: profile.username });
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("normalizes handles and fails closed if availability cannot be checked", async () => {
    await checkSignupUsername(" @New_Artist ");
    expect(mocks.rpc).toHaveBeenCalledWith("is_signup_username_available", { p_username: "new_artist" });
    for (const response of [{ data: null, error: null }, { data: true, error: { message: "missing RPC" } }]) {
      mocks.rpc.mockResolvedValue(response);
      await expect(createSupabaseAccountProfile(profile, "test-password")).rejects.toThrow(/Could not check/);
    }
    mocks.rpc.mockRejectedValue(new Error("Offline"));
    await expect(createSupabaseAccountProfile(profile, "test-password")).rejects.toThrow(/Could not check/);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("only sends a valid new signup once and leaves unconfirmed profiles to the Auth trigger", async () => {
    expect(await createSupabaseAccountProfile(profile, "test-password")).toMatchObject({ saved: false, needsEmailConfirmation: true, userId: "new-id" });
    expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ email: "new@example.test", options: {
      emailRedirectTo: "https://www.mysplit.co/", data: expect.objectContaining({ username: "new_artist", legal_name: "Test Artist" }),
    } }));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("carries the invitation through a new account's confirmation link", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    window.history.replaceState(null, "", `/?split=${id}`);
    await createSupabaseAccountProfile(profile, "test-password");
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ emailRedirectTo: `https://www.mysplit.co/?split=${id}` }) }));
  });

  it("recovers a username collision that happens after the initial check", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "unexpected_failure", message: "Database error saving new user" } });
    await expect(createSupabaseAccountProfile(profile, "test-password")).rejects.toMatchObject({ code: "username_unavailable" });
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "unexpected_failure", message: "Database error saving new user" }, /finish account setup/],
    [{ code: "email_address_not_authorized", message: "not authorized" }, /delivery is not available/],
    [{ code: "over_email_send_rate_limit", status: 429, message: "rate limited" }, /wait before trying/],
  ])("does not disguise other signup failures as a taken handle", async (error, message) => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error });
    await expect(createSupabaseAccountProfile(profile, "test-password")).rejects.toThrow(message);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("routes unconfirmed sign-in to recovery without reading or changing private records", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "email_not_confirmed", message: "Email not confirmed" } });
    await expect(signInAndLoadSupabaseProfile(" NEW@example.test ", "test-password")).rejects.toBeInstanceOf(AccountAccessError);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "new@example.test", password: "test-password" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads the confirmed user's stored profile without resubmitting signup", async () => {
    const stored = { ...profile, emailAddress: "new@example.test" };
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: "new-id", email: stored.emailAddress, user_metadata: {} } }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: "new-id", username: profile.username, legal_name: profile.legalName, profile_data: stored }, error: null });
    expect(await signInAndLoadSupabaseProfile(stored.emailAddress, "test-password")).toMatchObject({ saved: true, userId: "new-id", profile: { username: "new_artist" } });
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "new-id");
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
