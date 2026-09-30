import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PhoneVerificationGate from "@/components/PhoneVerificationGate";
import { loadAccountPhone, requestPhoneVerification, confirmPhoneVerification } from "@/lib/accountPhone";
import { createEmptyProfile } from "@/lib/userProfile";
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true }));
vi.mock("@/lib/accountPhone", () => ({ loadAccountPhone: vi.fn(), requestPhoneVerification: vi.fn(), confirmPhoneVerification: vi.fn() }));
const profile = { ...createEmptyProfile(), authUserId: "owner", phoneCountryCode: "+1", phoneNumber: "2025550100" };
const status = { userId: "owner", required: true, verified: false, phone: "", pendingPhone: "" };
const signOut = vi.fn();
const view = (id = "owner") => <PhoneVerificationGate profile={{ ...profile, authUserId: id }} onSignOut={signOut}><h1>Dashboard</h1></PhoneVerificationGate>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VITE_PHONE_VERIFICATION_ENABLED", "true");
  vi.mocked(loadAccountPhone).mockResolvedValue(status);
  vi.mocked(requestPhoneVerification).mockResolvedValue("+12025550100");
  vi.mocked(confirmPhoneVerification).mockResolvedValue({ ...status, verified: true });
});
afterEach(() => vi.unstubAllEnvs());
describe("phone verification gate", () => {
  it.each([undefined, "false"])("skips phone status and SMS while rollout is paused (%s)", async enabled => {
    vi.stubEnv("VITE_PHONE_VERIFICATION_ENABLED", enabled);
    vi.mocked(loadAccountPhone).mockRejectedValue(new Error("Status RPC not deployed"));
    render(view());
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("Verify your phone")).not.toBeInTheDocument();
    expect(loadAccountPhone).not.toHaveBeenCalled();
    expect(requestPhoneVerification).not.toHaveBeenCalled();
    expect(confirmPhoneVerification).not.toHaveBeenCalled();
  });
  it("resumes a pending phone code after reload without sending another text", async () => {
    vi.mocked(loadAccountPhone).mockResolvedValue({ ...status, pendingPhone: "12025550100" });
    render(view());
    expect(await screen.findByLabelText("Text message code")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone number")).toHaveValue("+12025550100");
    expect(requestPhoneVerification).not.toHaveBeenCalled();
  });
  it("keeps rollout disabled until SMS is configured", async () => {
    vi.mocked(loadAccountPhone).mockResolvedValue({ ...status, required: false });
    render(view());
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(requestPhoneVerification).not.toHaveBeenCalled();
  });
  it("blocks protected UI until verification and prevents repeated SMS clicks", async () => {
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Send verification text" }));
    await waitFor(() => expect(screen.getByLabelText("Text message code")).toHaveFocus());
    expect(screen.getByRole("button", { name: /Resend in/ })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Text message code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(requestPhoneVerification).toHaveBeenCalledTimes(1);
  });
  it("keeps a failed code on the same account with retry and sign out available", async () => {
    vi.mocked(confirmPhoneVerification).mockRejectedValue(new Error("Invalid code"));
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Send verification text" }));
    fireEvent.change(await screen.findByLabelText("Text message code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid code");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
  it("does not unlock a new account from an old account's pending status request", async () => {
    let finish!: (value: typeof status) => void;
    vi.mocked(loadAccountPhone).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { rerender } = render(view());
    rerender(view("other"));
    await waitFor(() => expect(loadAccountPhone).toHaveBeenCalledWith("other"));
    await act(async () => finish({ ...status, verified: true }));
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });
  it("fails closed with a visible recovery action when status cannot load", async () => {
    vi.mocked(loadAccountPhone).mockRejectedValueOnce(new Error("offline"));
    render(view());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not check/);
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    expect(await screen.findByRole("button", { name: "Send verification text" })).toBeInTheDocument();
  });
});
