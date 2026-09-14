import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import { makeCounterDocument } from "@/test/fixtures/splitSheet";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/notificationStorage", () => ({
  loadSplitNotifications: async () => [],
  markSplitNotificationsRead: async () => 1,
  subscribeToSplitNotifications: async () => () => undefined,
}));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "creator-account" } }, error: null }) }, rpc: mocks.rpc,
} }));

describe("dashboard save and refresh ordering", () => {
  beforeEach(() => { localStorage.clear(); mocks.rpc.mockReset(); });

  it("does not overwrite a confirmed message with an older in-flight refresh", async () => {
    const document = makeCounterDocument();
    document.creatorUserId = "creator-account";
    document.creatorProfile.authUserId = "creator-account";
    const oldRead = { data: [{ id: document.id, document_payload: document }], error: null };
    let finishRead!: (value: typeof oldRead) => void;
    let loads = 0;
    mocks.rpc.mockImplementation(async (name, args) => {
      if (name === "load_my_split_sheets") {
        if (++loads === 1) return oldRead;
        return new Promise(resolve => { finishRead = resolve; });
      }
      if (name === "apply_split_sheet_participant_update") {
        return { data: { ...args.p_document_payload, serverRevision: 3 }, error: null };
      }
      return { data: [], error: null };
    });
    render(<Dashboard userProfile={document.creatorProfile} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} />);
    await screen.findByRole("button", { name: "Open messages" });
    fireEvent.click(screen.getByRole("button", { name: "Open messages" }));
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(loads).toBe(2));
    const composer = screen.getByPlaceholderText(/message the collaborators/i);
    fireEvent.change(composer, { target: { value: "Confirmed new message" } });
    fireEvent.keyDown(composer, { key: "Enter" });
    await waitFor(() => expect(composer).toHaveValue(""));
    expect(screen.getAllByText("Confirmed new message").length).toBeGreaterThan(0);
    await act(async () => finishRead(oldRead));
    expect(screen.getAllByText("Confirmed new message").length).toBeGreaterThan(0);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === "apply_split_sheet_participant_update")).toHaveLength(1);
  });
});
