import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { confirmPhoneVerification, loadAccountPhone, normalizeAccountPhone, requestPhoneVerification } from "@/lib/accountPhone";
import { verifiedPhoneFields } from "@/lib/verifiedPhone";
import { isSupportedInvitation } from "@/lib/inviteIdentity";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn() }, rpc: vi.fn() } }));
const user = { id: "owner", email_confirmed_at: "2026-01-01", phone: "12025550100", phone_confirmed_at: "2026-01-01" };
const state = { userId: "owner", required: true, verified: true, phone: user.phone, pendingPhone: "" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user }, error: null } as never);
  vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user }, error: null } as never);
  vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ data: { user }, error: null } as never);
  vi.mocked(supabase.rpc).mockImplementation(name => Promise.resolve({ data: name === "my_phone_verification_status" ? state : null, error: null }) as never);
});
describe("account phone verification", () => {
  it("normalizes real international numbers, rejecting missing codes and invalid numbers", () => {
    expect(normalizeAccountPhone("+1 (202) 555-0100")).toBe("+12025550100");
    expect(normalizeAccountPhone("+44 7911 123456")).toBe("+447911123456");
    for (const phone of ["2025550100", "+1 12", "+0001234", ""]) expect(() => normalizeAccountPhone(phone)).toThrow();
  });
  it("uses phone_change on the existing email account, never signs up another account", async () => {
    await requestPhoneVerification("owner", "+12025550100");
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ phone: "+12025550100" });
    expect(await confirmPhoneVerification("owner", "+12025550100", "123456")).toEqual(state);
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ phone: "+12025550100", token: "123456", type: "phone_change" });
    expect(supabase.rpc).toHaveBeenCalledWith("sync_my_verified_phone", { p_country_code: "+1", p_national_number: "2025550100" });
  });
  it("rejects a stale or email-unconfirmed account before sending a text", async () => {
    await expect(requestPhoneVerification("other", "+12025550100")).rejects.toThrow(/Confirm your email/);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null } as never);
    await expect(requestPhoneVerification("owner", "+12025550100")).rejects.toThrow();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
  it("does not accept an OTP without a server-confirmed phone or for the wrong account", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { ...user, phone_confirmed_at: null } }, error: null } as never);
    await expect(confirmPhoneVerification("owner", "+12025550100", "123456")).rejects.toThrow(/not been verified/);
    expect(supabase.rpc).not.toHaveBeenCalled();
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ data: { user: { ...user, id: "other" } }, error: null } as never);
    await expect(confirmPhoneVerification("owner", "+12025550100", "123456")).rejects.toThrow(/account changed/);
  });
  it("rejects wrong-number confirmation and invalid code lengths", async () => {
    await expect(confirmPhoneVerification("owner", "+12025550101", "123456")).rejects.toThrow(/not been verified/);
    await expect(confirmPhoneVerification("owner", "+12025550100", "12")).rejects.toThrow(/six-digit/);
  });
  it("maps provider/rate-limit errors without exposing provider payloads", async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user: null }, error: { code: "over_sms_send_rate_limit", message: "private payload" } } as never);
    await expect(requestPhoneVerification("owner", "+12025550100")).rejects.toThrow(/wait a minute/);
  });
  it("retries profile synchronization on a status check after OTP succeeded", async () => {
    await loadAccountPhone("owner");
    expect(supabase.rpc).toHaveBeenCalledWith("sync_my_verified_phone", expect.any(Object));
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: "offline" } } as never);
    await expect(loadAccountPhone("owner")).rejects.toThrow();
  });
  it("never treats an editable profile number as Auth proof", () => {
    expect(verifiedPhoneFields({ phone: user.phone })).toEqual({});
    expect(verifiedPhoneFields(user)).toEqual({ phoneCountryCode: "+1", phoneNumber: "2025550100" });
  });
});
describe("beta invitation identities", () => {
  it.each(["@artist.name", "artist_123"])("allows username %s", value => expect(isSupportedInvitation("username", value)).toBe(true));
  it("allows email but no phone identity or malformed email", () => {
    expect(isSupportedInvitation("email", "artist@example.test")).toBe(true);
    expect(isSupportedInvitation("phone", "+12025550100")).toBe(false);
    expect(isSupportedInvitation("email", "artist@example")).toBe(false);
    expect(isSupportedInvitation("username", "+12025550100")).toBe(false);
  });
});
