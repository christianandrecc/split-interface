import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import NotificationsPopover from "@/components/NotificationsPopover";
import type { SplitNotification } from "@/lib/notificationStorage";

const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeAll(() => Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));
afterAll(() => {
  if (originalScrollIntoView) Object.defineProperty(Element.prototype, "scrollIntoView", originalScrollIntoView);
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
});

function notification(id: string, eventType = "split_invite", readAt: string | null = null): SplitNotification {
  return { id, eventType, title: id, readAt, recipientUserId: "viewer", actorUserId: "collaborator", actorLabel: "Maya",
    splitSheetId: "sheet", body: `Maya updated ${id}.`, actionTarget: "messages", metadata: {}, createdAt: new Date().toISOString() };
}
const items = [notification("New invitation"), notification("New proposal", "counter_offer"), notification("Signed agreement", "signature", "2026-09-01")];
const props = () => ({ notifications: items, loading: false, onViewAll: vi.fn(), onOpenNotification: vi.fn(), onMarkAllRead: vi.fn() });
const open = () => fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
const unread = () => fireEvent.mouseDown(screen.getByRole("tab", { name: "Unread" }), { button: 0, ctrlKey: false });
async function category(name: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Notification type" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name }));
}

describe("notification panel", () => {
  it("opens without marking anything read and shows only the unread count", () => {
    const callbacks = props();
    render(<NotificationsPopover {...callbacks} />); open();
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("2 unread")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Signed agreement")).toBeInTheDocument();
    expect(callbacks.onMarkAllRead).not.toHaveBeenCalled();
    expect(callbacks.onOpenNotification).not.toHaveBeenCalled();
  });

  it("combines unread and type filters, preserves them on reopen, and clears empty results", async () => {
    const callbacks = props();
    render(<NotificationsPopover {...callbacks} />); open(); unread();
    expect(screen.queryByText("Signed agreement")).not.toBeInTheDocument();
    screen.getByRole("tabpanel").scrollTop = 200;
    await category("Invites");
    expect(screen.getByRole("tabpanel").scrollTop).toBe(0);
    expect(screen.getByText("New invitation")).toBeInTheDocument();
    expect(screen.queryByText("New proposal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open notifications" })).toHaveFocus());
    open();
    expect(screen.getByRole("tab", { name: "Unread" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox")).toHaveTextContent("Invites");
    await category("Signatures");
    expect(screen.getByText("No unread signatures")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all notifications" }));
    expect(screen.getByText("Signed agreement")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("All types");
    expect(callbacks.onMarkAllRead).not.toHaveBeenCalled();
  });

  it("opens the selected notification once and closes the panel", () => {
    const callbacks = props(); render(<NotificationsPopover {...callbacks} />); open();
    fireEvent.click(screen.getByRole("button", { name: /New invitation.*Open messages/ }));
    expect(callbacks.onOpenNotification).toHaveBeenCalledExactlyOnceWith(items[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks all notifications, not just the visible category, and updates unread state", async () => {
    const callbacks = props(); const { rerender } = render(<NotificationsPopover {...callbacks} />); open(); unread();
    await category("Invites");
    fireEvent.click(screen.getByRole("button", { name: "Mark all notifications as read" }));
    await waitFor(() => expect(callbacks.onMarkAllRead).toHaveBeenCalledExactlyOnceWith());
    rerender(<NotificationsPopover {...callbacks} notifications={items.map((item) => ({ ...item, readAt: "2026-09-16" }))} />);
    expect(screen.getByText("0 unread")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all notifications as read" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open notifications" }).querySelector(".notification-bell-dot")).toBeNull();
    expect(screen.getByText("No unread invites")).toBeInTheDocument();
  });

  it("keeps mark-read pending and presents callback failures without closing the panel", async () => {
    let reject!: (reason: Error) => void;
    const callbacks = { ...props(), onMarkAllRead: vi.fn(() => new Promise<void>((_, fail) => { reject = fail; })) };
    render(<NotificationsPopover {...callbacks} />); open();
    const button = screen.getByRole("button", { name: "Mark all notifications as read" });
    fireEvent.click(button); fireEvent.click(button);
    expect(button).toBeDisabled(); expect(callbacks.onMarkAllRead).toHaveBeenCalledOnce();
    await act(async () => reject(new Error("Offline")));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not mark notifications as read");
    expect(button).not.toBeDisabled();
  });

  it("handles loading, empty, and caught-up states without a misleading notification badge", () => {
    const callbacks = props(); const { rerender } = render(<NotificationsPopover {...callbacks} notifications={[]} loading />); open();
    expect(screen.getByText("Loading notifications")).toBeInTheDocument();
    rerender(<NotificationsPopover {...callbacks} notifications={[]} />);
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    rerender(<NotificationsPopover {...callbacks} notifications={[items[2]]} />); unread();
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByText("0 unread")).toBeInTheDocument();
  });

  it("reflects incoming events in the active filter and routes View all activity", () => {
    const callbacks = props(); const { rerender } = render(<NotificationsPopover {...callbacks} />); open(); unread();
    const latest = notification("Another invitation");
    rerender(<NotificationsPopover {...callbacks} notifications={[latest, ...items]} />);
    expect(within(screen.getByRole("tabpanel")).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("3 unread")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all activity" }));
    expect(callbacks.onViewAll).toHaveBeenCalledOnce(); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
