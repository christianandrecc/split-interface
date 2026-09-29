import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, ChevronRight, FileText, GitBranch, Loader2, MessageCircle, SlidersHorizontal, X } from "lucide-react";
import { format, isSameDay, isValid } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDashboardNotificationPresentation, groupNotificationFeed, NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/dashboardNotifications";
import type { SplitNotification } from "@/lib/notificationStorage";
import "./notifications.css";

const icons = { alert: AlertTriangle, check: CheckCircle2, counter: GitBranch, file: FileText, message: MessageCircle };

export default function NotificationsPopover({ notifications, loading, onViewAll, onOpenNotification, onMarkAllRead }: {
  notifications: SplitNotification[];
  loading: boolean;
  onViewAll: () => void;
  onOpenNotification: (notification: SplitNotification) => void;
  onMarkAllRead: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("all");
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [markingRead, setMarkingRead] = useState(false);
  const [markError, setMarkError] = useState(false);
  const titleId = useId();
  const countId = useId();
  const statusTabsRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const restoreBellFocus = useRef(false);
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, [view, category]);
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const now = new Date();
  const groups = groupNotificationFeed(notifications, { unreadOnly: view === "unread", category, now });
  const resultCount = groups.reduce((count, group) => count + group.items.length, 0);
  const filtered = view !== "all" || category !== "all";
  const emptyLabel = !notifications.length ? "No notifications yet"
    : view === "unread" && category === "all" ? "You're all caught up"
    : `No ${view === "unread" ? "unread " : ""}${category === "all" ? "notifications" : category}`;

  const markAllRead = async () => {
    if (markingRead || !unreadCount) return;
    setMarkingRead(true);
    setMarkError(false);
    try { await onMarkAllRead(); }
    catch { setMarkError(true); }
    finally { setMarkingRead(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button ref={bellRef} type="button" aria-label="Open notifications" aria-describedby={countId} className="notification-bell split-press">
          <Bell size={19} aria-hidden="true" />
          {unreadCount > 0 && <span className="notification-bell-dot" aria-hidden="true" />}
          <span id={countId} className="sr-only">{unreadCount} unread notifications</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} collisionPadding={12} className="notification-panel" aria-labelledby={titleId}
        onOpenAutoFocus={(event) => { event.preventDefault(); restoreBellFocus.current = false; statusTabsRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(); }}
        onEscapeKeyDown={() => { restoreBellFocus.current = true; }}
        onCloseAutoFocus={(event) => {
          // The nested type menu counts as an outside interaction to the popover.
          if (restoreBellFocus.current) { event.preventDefault(); bellRef.current?.focus(); }
          restoreBellFocus.current = false;
        }}>
        <header className="notification-heading">
          <div className="notification-heading-copy">
            <h2 id={titleId}>Notifications</h2>
            <span className="notification-unread-count">{unreadCount} unread</span>
          </div>
          <TooltipProvider delayDuration={250}>
            <div className="notification-heading-actions">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Mark all notifications as read" disabled={loading || !unreadCount || markingRead}
                    aria-busy={markingRead} className="notification-icon-button" onClick={() => void markAllRead()}>
                    {markingRead ? <Loader2 size={18} className="animate-spin" /> : <CheckCheck size={18} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Mark all as read</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Close notifications" className="notification-icon-button" onClick={() => { restoreBellFocus.current = true; setOpen(false); }}><X size={18} /></button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </header>
        {markError && <p role="alert" className="notification-error">Could not mark notifications as read. Please try again.</p>}
        <Tabs value={view} onValueChange={setView} className="notification-tabs">
          <div className="notification-toolbar">
            <TabsList ref={statusTabsRef} aria-label="Notification read status" className="notification-view-switch">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
            <Select value={category} onValueChange={(value) => setCategory(value as NotificationCategory)}>
              <SelectTrigger aria-label="Notification type" className="notification-type-filter" data-filtered={category !== "all"}>
                <SlidersHorizontal size={14} aria-hidden="true" /><SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="notification-type-menu">
                {NOTIFICATION_CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {["all", "unread"].map((tab) => (
            <TabsContent key={tab} value={tab} ref={view === tab ? feedRef : undefined} className="notification-feed" aria-busy={loading}>
              {loading && !notifications.length ? (
                <div className="notification-empty" role="status"><Loader2 size={24} className="animate-spin" /><p>Loading notifications</p></div>
              ) : !resultCount ? (
                <div className="notification-empty" role="status">
                  {view === "unread" ? <CheckCheck size={26} /> : <Bell size={26} />}
                  <p>{emptyLabel}</p>
                  {filtered && <button type="button" onClick={() => { setView("all"); setCategory("all"); }}>Show all notifications<ChevronRight size={14} /></button>}
                </div>
              ) : groups.map(({ label, items }) => (
                <section key={label} aria-label={label} className="notification-date-group">
                  <h3>{label}</h3>
                  <ul>
                    {items.map((notification) => {
                      const presentation = getDashboardNotificationPresentation(notification);
                      const Icon = icons[presentation.iconKey];
                      const date = new Date(notification.createdAt);
                      return (
                        <li key={notification.id}>
                          <button type="button" className="notification-row" data-unread={!notification.readAt}
                            title={`${notification.title}\n${notification.body}\n${presentation.actionLabel}`}
                            onClick={() => { setOpen(false); onOpenNotification(notification); }}>
                            <span className="notification-event-icon" data-tone={presentation.toneKey}><Icon size={17} aria-hidden="true" /></span>
                            <span className="notification-row-copy">
                              <span className="notification-row-title">{notification.title}</span>
                              <span className="notification-row-body">{notification.body}</span>
                              {isValid(date) && <time className="notification-row-time" dateTime={notification.createdAt} title={date.toLocaleString()}>
                                {format(date, isSameDay(date, now) ? "h:mm a" : "MMM d, h:mm a")}
                              </time>}
                            </span>
                            <span className="notification-row-trailing">
                              {!notification.readAt && <span className="notification-row-dot" aria-label="Unread" />}
                              <ChevronRight size={15} aria-hidden="true" />
                            </span>
                            <span className="sr-only">{presentation.actionLabel}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </TabsContent>
          ))}
        </Tabs>
        <footer className="notification-footer">
          <span role="status">{loading ? "Updating..." : `${resultCount} ${resultCount === 1 ? "notification" : "notifications"}`}</span>
          <button type="button" onClick={() => { setOpen(false); onViewAll(); }}>View all activity<ChevronRight size={15} aria-hidden="true" /></button>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
