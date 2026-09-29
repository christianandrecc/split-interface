import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/fixtures/splitSheet";

const notificationMocks = vi.hoisted(() => ({
  loadSplitNotifications: vi.fn(),
  markSplitNotificationsRead: vi.fn(),
  subscribeToSplitNotifications: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/notificationStorage", () => ({
  loadSplitNotifications: notificationMocks.loadSplitNotifications,
  markSplitNotificationsRead: notificationMocks.markSplitNotificationsRead,
  subscribeToSplitNotifications: notificationMocks.subscribeToSplitNotifications,
}));

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    rpc: supabaseMocks.rpc,
  },
}));

function makeProfile(): UserProfile {
  return {
    ...createEmptyProfile(),
    username: "mayarios",
    displayName: "Maya Rios",
    emailAddress: "maya@example.com",
  };
}

describe("dashboard notifications", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    notificationMocks.loadSplitNotifications.mockReset();
    notificationMocks.markSplitNotificationsRead.mockReset();
    notificationMocks.subscribeToSplitNotifications.mockReset();
    notificationMocks.loadSplitNotifications.mockResolvedValue([]);
    notificationMocks.markSplitNotificationsRead.mockResolvedValue(1);
    notificationMocks.subscribeToSplitNotifications.mockResolvedValue(() => undefined);
    supabaseMocks.getUser.mockReset();
    supabaseMocks.rpc.mockReset();
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: "maya-user" } },
      error: null,
    });
    supabaseMocks.rpc.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it("opens an email invitation only after the account-scoped loader returns that split", async () => {
    const document = makeDocument();
    document.id = "11111111-1111-4111-8111-111111111111";
    document.sentAt = document.createdAt;
    window.history.replaceState(null, "", `/?split=${document.id}`);
    supabaseMocks.rpc.mockImplementation(async (fn: string) => ({
      data: fn === "load_my_split_sheets" ? [{ id: document.id, updated_at: document.updatedAt, document_payload: document }] : null,
      error: null,
    }));
    render(<Dashboard userProfile={makeProfile()} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} />);
    expect(await screen.findByPlaceholderText(/message the collaborators/i)).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(supabaseMocks.rpc.mock.calls.some(([name]) => name === "apply_split_sheet_participant_update")).toBe(false);
  });

  it("offers account switching for an inaccessible invitation instead of opening a different split", async () => {
    window.history.replaceState(null, "", "/?split=11111111-1111-4111-8111-111111111111");
    const onSignOut = vi.fn();
    render(<Dashboard userProfile={makeProfile()} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} onSignOut={onSignOut} />);
    expect(await screen.findByText(/This invitation isn.t available to this account/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/message the collaborators/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch account" }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(window.location.search).toContain("split=");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(window.location.search).toBe("");
  });

  it("loads real notifications into the bell and opens the related Messages room", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    supabaseMocks.rpc.mockImplementation(async (fn: string) => {
      if (fn === "load_my_split_sheets") {
        return {
          data: [{ id: document.id, updated_at: document.updatedAt, document_payload: document }],
          error: null,
        };
      }

      return { data: null, error: null };
    });

    notificationMocks.loadSplitNotifications.mockResolvedValue([
      {
        id: "notification-1",
        recipientUserId: "maya-user",
        splitSheetId: document.id,
        actorUserId: "chori-user",
        actorLabel: "Chori",
        eventType: "split_invite",
        title: "New split sheet invite",
        body: 'Chori sent "Night Swim" for review.',
        actionTarget: "messages",
        metadata: {},
        readAt: null,
        createdAt: document.updatedAt,
      },
    ]);

    render(
      <Dashboard
        userProfile={makeProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByLabelText("Open notifications"));
    expect(await screen.findByText("New split sheet invite")).toBeInTheDocument();
    expect(screen.getAllByText('Chori sent "Night Swim" for review.').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("New split sheet invite").closest("button")!);

    await waitFor(() =>
      expect(notificationMocks.markSplitNotificationsRead).toHaveBeenCalledWith({
        notificationIds: ["notification-1"],
      }),
    );
    expect(screen.getByPlaceholderText(/message the collaborators/i)).toBeInTheDocument();
  });

  it("routes activity-targeted notifications to activity even when they reference a split sheet", async () => {
    notificationMocks.loadSplitNotifications.mockResolvedValue([{
      id: "activity-notification", recipientUserId: "maya-user", splitSheetId: "sheet-id", actorUserId: "chori-user",
      actorLabel: "Chori", eventType: "split_updated", title: "Work details updated", body: "Chori updated Night Swim.",
      actionTarget: "activity", metadata: {}, readAt: null, createdAt: new Date().toISOString(),
    }]);
    render(<Dashboard userProfile={makeProfile()} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} />);
    fireEvent.click(await screen.findByLabelText("Open notifications"));
    fireEvent.click((await screen.findByText("Work details updated")).closest("button")!);
    expect(screen.getByRole("heading", { name: "Split Sheet Activity" })).toBeInTheDocument();
    expect(notificationMocks.markSplitNotificationsRead).toHaveBeenCalledWith({ notificationIds: ["activity-notification"] });
  });
});
