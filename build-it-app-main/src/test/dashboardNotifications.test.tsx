import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import { saveLocalSplitSheetDocuments } from "@/lib/splitSheetStorage";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/splitSheetWorkflow.test";

const notificationMocks = vi.hoisted(() => ({
  loadSplitNotifications: vi.fn(),
  markSplitNotificationsRead: vi.fn(),
  subscribeToSplitNotifications: vi.fn(),
}));

vi.mock("@/lib/notificationStorage", () => ({
  loadSplitNotifications: notificationMocks.loadSplitNotifications,
  markSplitNotificationsRead: notificationMocks.markSplitNotificationsRead,
  subscribeToSplitNotifications: notificationMocks.subscribeToSplitNotifications,
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
  beforeEach(() => {
    window.localStorage.clear();
    notificationMocks.loadSplitNotifications.mockReset();
    notificationMocks.markSplitNotificationsRead.mockReset();
    notificationMocks.subscribeToSplitNotifications.mockReset();
    notificationMocks.loadSplitNotifications.mockResolvedValue([]);
    notificationMocks.markSplitNotificationsRead.mockResolvedValue(1);
    notificationMocks.subscribeToSplitNotifications.mockResolvedValue(() => undefined);
  });

  it("loads real notifications into the bell and opens the related Messages room", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    saveLocalSplitSheetDocuments([document]);

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
    expect(screen.getByText('Chori sent "Night Swim" for review.')).toBeInTheDocument();

    fireEvent.click(screen.getByText("New split sheet invite").closest("button")!);

    await waitFor(() =>
      expect(notificationMocks.markSplitNotificationsRead).toHaveBeenCalledWith({
        notificationIds: ["notification-1"],
      }),
    );
    expect(screen.getByPlaceholderText(/message the collaborators/i)).toBeInTheDocument();
  });
});
