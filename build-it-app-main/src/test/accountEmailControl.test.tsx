import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountEmailControl from "@/components/AccountEmailControl";
import ProfilePage from "@/components/ProfilePage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createEmptyProfile } from "@/lib/userProfile";

const mocks = vi.hoisted(() => ({ load: vi.fn(), request: vi.fn(), resend: vi.fn(), unsubscribe: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock("@/lib/accountEmail", () => ({ loadAccountEmail: mocks.load, requestAccountEmailChange: mocks.request, resendAccountEmailChange: mocks.resend }));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabase: { auth: { onAuthStateChange: mocks.onAuthStateChange } } }));
const current = { userId: "account-a", email: "current@example.test", pendingEmail: null };
const pending = { ...current, pendingEmail: "new@example.test" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
  mocks.load.mockResolvedValue(current);
  mocks.request.mockResolvedValue(pending);
  mocks.resend.mockResolvedValue(pending);
});
async function openChange() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Change email" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Change email" }));
  fireEvent.change(screen.getByLabelText("New email address"), { target: { value: pending.pendingEmail } });
}
describe("account email control", () => {
  it("separates email confirmation from profile saves and keeps the active email visible", async () => {
    render(<AccountEmailControl userId={current.userId} />);
    await openChange();
    fireEvent.click(screen.getByRole("button", { name: "Send confirmation" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.request).toHaveBeenCalledWith(current.userId, pending.pendingEmail);
    expect(screen.getByText(current.email)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting confirmation/)).toHaveTextContent(pending.pendingEmail);
  });
  it("cancels without sending", async () => {
    render(<AccountEmailControl userId={current.userId} />);
    await openChange();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("blocks duplicate submissions while the request is pending", async () => {
    let finish!: (value: typeof pending) => void;
    mocks.request.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<AccountEmailControl userId={current.userId} />);
    await openChange();
    fireEvent.click(screen.getByRole("button", { name: "Send confirmation" }));
    expect(screen.getByRole("button", { name: "Requesting..." })).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("New email address").closest("form")!);
    expect(mocks.request).toHaveBeenCalledOnce();
    await act(async () => finish(pending));
  });
  it("shows request errors without claiming the email changed", async () => {
    mocks.request.mockRejectedValue(new Error("Please wait a minute."));
    render(<AccountEmailControl userId={current.userId} />);
    await openChange();
    fireEvent.click(screen.getByRole("button", { name: "Send confirmation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait a minute.");
    expect(within(screen.getByRole("dialog")).getByText(current.email)).toBeInTheDocument();
    expect(screen.queryByText(/Awaiting confirmation/)).not.toBeInTheDocument();
  });
  it("restores pending state, resends, and checks confirmed Auth state", async () => {
    mocks.load.mockResolvedValue(pending);
    render(<AccountEmailControl userId={current.userId} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resend confirmation" }));
    await waitFor(() => expect(mocks.resend).toHaveBeenCalledWith(current.userId));
    await screen.findByText("Confirmation requested. Check your inboxes.");
    mocks.load.mockResolvedValue({ ...current, email: pending.pendingEmail });
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    await waitFor(() => expect(screen.queryByText(/Awaiting confirmation/)).not.toBeInTheDocument());
    expect(screen.getByText(pending.pendingEmail)).toBeInTheDocument();
    expect(screen.queryByText(current.email)).not.toBeInTheDocument();
  });
  it("does not expose email actions without an authenticated account", () => {
    render(<AccountEmailControl />);
    expect(screen.getByRole("button", { name: "Change email" })).toBeDisabled();
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("ignores a late result after the account view unmounts", async () => {
    let finish!: (value: typeof current) => void;
    mocks.load.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const view = render(<AccountEmailControl key="a" userId="account-a" />);
    mocks.load.mockResolvedValue({ ...current, userId: "account-b", email: "b@example.test" });
    view.rerender(<AccountEmailControl key="b" userId="account-b" />);
    await screen.findByText("b@example.test");
    await act(async () => finish(current));
    expect(screen.queryByText(current.email)).not.toBeInTheDocument();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
  it("preserves unsaved profile edits when a confirmed email arrives", async () => {
    const profile = { ...createEmptyProfile(), authUserId: current.userId, displayName: "Artist", emailAddress: current.email };
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);
    const view = render(<TooltipProvider><ProfilePage userProfile={profile} onUpdateProfile={onUpdateProfile} /></TooltipProvider>);
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Unfinished edit" } });
    view.rerender(<TooltipProvider><ProfilePage userProfile={{ ...profile, emailAddress: pending.pendingEmail }} onUpdateProfile={onUpdateProfile} /></TooltipProvider>);
    expect(screen.getByLabelText("Display Name")).toHaveValue("Unfinished edit");
    expect(screen.queryByLabelText("Email Address")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(onUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Unfinished edit", emailAddress: pending.pendingEmail })));
  });
});
