import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountContractBuilder from "@/components/contract-builder/AccountContractBuilder";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { DEFAULT_APP_SETTINGS } from "@/lib/accountSettings";
import { makeDocument } from "@/test/fixtures/splitSheet";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/accountSettings", async (original) => ({ ...await original<typeof import("@/lib/accountSettings")>(), loadAccountSettings: load }));
const settings = { ...DEFAULT_APP_SETTINGS, defaultSplitMethod: "Equal" as const, defaultUserRole: "Composer" as const, defaultTerritory: "Canada", includeAuditTrail: false };
beforeEach(() => { vi.resetAllMocks(); load.mockResolvedValue({ settings, revision: 3 }); });
function props() {
  return { userProfile: { ...makeDocument().creatorProfile, authUserId: "account-a" }, onBack: vi.fn(), onSendDocument: vi.fn(),
    onStoreDocument: vi.fn(async (document: StoredSplitSheetDocument) => ({ document, persisted: true })) };
}
describe("new split defaults", () => {
  it("loads saved defaults before creation and sends the role, method and society territory into the draft", async () => {
    const callbacks = props();
    render(<AccountContractBuilder {...callbacks} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading split defaults");
    const title = await screen.findByPlaceholderText("e.g. Work title");
    fireEvent.change(title, { target: { value: "Saved defaults" } });
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(callbacks.onStoreDocument).toHaveBeenCalledOnce());
    expect(callbacks.onStoreDocument.mock.calls[0][0].data).toMatchObject({ splitType: "Equal", includeAuditTrail: true,
      parties: [expect.objectContaining({ role: "Composer", societyTerritory: "Canada", percent: 100 })] });
    expect(load).toHaveBeenCalledWith("account-a");
  });
  it("never overwrites a saved draft with changed preferences", async () => {
    const draft = makeDocument(); draft.status = "Draft";
    const callbacks = props();
    render(<ContractBuilder {...callbacks} initialDocument={draft} settings={settings} />);
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(callbacks.onStoreDocument).toHaveBeenCalledOnce());
    expect(callbacks.onStoreDocument.mock.calls[0][0].data).toEqual(draft.data);
    expect(load).not.toHaveBeenCalled();
  });
  it("lets drafts open without fetching new-work defaults", () => {
    const draft = makeDocument(); draft.status = "Draft";
    render(<AccountContractBuilder {...props()} initialDocument={draft} />);
    expect(screen.getByRole("heading", { name: "Review Draft" })).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
  it("offers retry after a failed read, not a silently incorrect default", async () => {
    load.mockRejectedValueOnce(new Error("Offline"));
    render(<AccountContractBuilder {...props()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    expect(screen.queryByPlaceholderText("e.g. Work title")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByPlaceholderText("e.g. Work title")).toBeInTheDocument();
  });
  it("does not initialize another account's builder from a late response", async () => {
    let resolve!: (result: unknown) => void;
    load.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const callbacks = props();
    const { rerender } = render(<AccountContractBuilder {...callbacks} />);
    rerender(<AccountContractBuilder {...callbacks} accountId="account-b" />);
    await screen.findByPlaceholderText("e.g. Work title");
    await act(async () => resolve({ settings: { ...settings, defaultUserRole: "Lyricist" }, revision: 9 }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Work title"), { target: { value: "Second account" } });
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(screen.getByText("Composer")).toBeInTheDocument();
    expect(screen.queryByText("Lyricist")).not.toBeInTheDocument();
  });
});
