import { useMemo, useState } from "react";
import { Archive, ArrowRight, CheckCircle2, CircleAlert, FileText, Filter, LockKeyhole, MessageCircle, Music2, PenLine, Plus } from "lucide-react";
import elephant from "@/assets/split-elephant-mascot.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Agreement } from "@/lib/splitSheetAgreement";
import { normalizeUserProfile, type UserProfile } from "@/lib/userProfile";
import type { SplitNotification } from "@/lib/notificationStorage";
import { filterWorkspaceRecords, workspaceActivity, workspaceDate, workspaceInitials, workspaceRecord, type WorkspaceFilter, type WorkspaceRecord, type WorkspaceSort } from "@/lib/workspaceOverview";
import "./workspace.css";

type Props = {
  agreements: Agreement[];
  userProfile: UserProfile;
  notifications: SplitNotification[];
  loading: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  onNew: () => void;
  onOpenAgreement: (id: string) => void;
  onOpenMessages: (id: string) => void;
  onOpenNotification: (notification: SplitNotification) => void;
  onViewActivity: () => void;
};

export default function WorkspaceOverview(props: Props) {
  const { agreements, userProfile, notifications, loading, onNew, onOpenAgreement, onOpenMessages } = props;
  const [filter, setFilter] = useState<WorkspaceFilter>("all");
  const [sort, setSort] = useState<WorkspaceSort>("recent");
  const [guideOpen, setGuideOpen] = useState(false);
  const { legalFirstName, legalLastName } = normalizeUserProfile(userProfile);
  const greetingName = [legalFirstName, legalLastName].filter(Boolean).join(" ");
  const records = useMemo(() => agreements.map((agreement) => workspaceRecord(agreement, userProfile)), [agreements, userProfile]);
  const visible = useMemo(() => filterWorkspaceRecords(records, filter, "", sort), [records, filter, sort]);
  const activity = useMemo(() => workspaceActivity(agreements, notifications), [agreements, notifications]);
  const counts = { all: records.length, attention: records.filter((item) => item.pending).length,
    signed: records.filter((item) => item.signed).length, drafts: records.filter((item) => item.agreement.status === "Draft").length };
  const openRecord = (record: WorkspaceRecord) => record.action === "messages" ? onOpenMessages(record.agreement.id) : onOpenAgreement(record.agreement.id);

  return (
    <div className="workspace-scroll">
      <div className="workspace-overview">
        <section aria-labelledby="workspace-heading" className="workspace-intro">
          <div className="workspace-title-row">
            <h1 id="workspace-heading">Hello{greetingName ? `, ${greetingName}` : ""}</h1>
            <time dateTime={new Date().toISOString().slice(0, 10)}>{workspaceDate(new Date().toISOString(), true)}</time>
          </div>
        </section>

        <section aria-labelledby="workspace-sheets-heading">
          {props.loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <span>Could not refresh split sheets.{records.length > 0 ? " Showing the last available records." : " Please try again."}</span>
            <button className="font-semibold underline underline-offset-4" disabled={loading} onClick={props.onRetry}>{loading ? "Retrying..." : "Retry"}</button>
          </div>}
          <div className="workspace-table-toolbar">
            <h2 id="workspace-sheets-heading">Split sheets</h2>
            <Popover>
              <PopoverTrigger asChild><button className="workspace-icon-button" aria-label="Filter and sort split sheets" title="Filter and sort" data-active={filter !== "all" || sort !== "recent"}><Filter size={21} /></button></PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-4">
                <div className="space-y-2"><label htmlFor="workspace-status" className="text-sm font-semibold">Status</label>
                  <select id="workspace-status" className="field-input" value={filter} onChange={(event) => setFilter(event.target.value as WorkspaceFilter)}>
                    <option value="all">All split sheets</option><option value="attention">Needs attention</option><option value="signed">Signed</option><option value="drafts">Drafts</option><option value="archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-2"><label htmlFor="workspace-sort" className="text-sm font-semibold">Sort by</label>
                  <select id="workspace-sort" className="field-input" value={sort} onChange={(event) => setSort(event.target.value as WorkspaceSort)}>
                    <option value="recent">Recently updated</option><option value="oldest">Oldest updated</option><option value="title">Title A-Z</option>
                  </select>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="workspace-counts" role="group" aria-label="Split sheet status filters">
            {([
              ["all", "All", FileText, ""], ["attention", "needs attention", CircleAlert, "pending"],
              ["drafts", "drafts", PenLine, ""], ["signed", "signed", CheckCircle2, "signed"],
            ] as const).map(([id, label, Icon, tone]) => (
              <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}>
                <Icon className={tone} aria-hidden="true" /><span><strong>{loading ? "..." : counts[id]}</strong> {label}</span>
              </button>
            ))}
            {filter === "archived" && <button aria-pressed="true" onClick={() => setFilter("archived")}><Archive aria-hidden="true" /><span>Archived</span></button>}
          </div>
          <div className="workspace-table" role="table" aria-label="Workspace split sheets" aria-busy={loading}>
            <div role="row" className="workspace-table-head">
              {["Work", "Collaborators", "Ownership", "Status", "Action"].map((label) => <div role="columnheader" key={label}>{label}</div>)}
            </div>
            {loading ? <div role="status" className="workspace-empty">Loading split sheets...</div> : visible.length ? visible.map((record) => (
              <WorkspaceRow key={record.agreement.id} record={record} onOpen={() => openRecord(record)} onView={() => onOpenAgreement(record.agreement.id)} />
            )) : props.loadError ? <div className="workspace-empty" role="status">Split sheets are unavailable.</div> : <div className="workspace-empty" role="status">
              <FileText size={28} aria-hidden="true" /><h3>{records.length ? "No matching split sheets" : "Your first SPLIT starts here"}</h3>
              {records.length ? <button className="workspace-action" onClick={() => setFilter("all")}>Clear filters</button>
                : <button className="workspace-action primary" onClick={onNew}><Plus size={18} />New SPLIT</button>}
            </div>}
          </div>
        </section>

        <section className="workspace-bottom" aria-label="Activity and private guide">
          <div className="workspace-activity">
            <div className="workspace-activity-heading"><h2>Recent activity</h2>
              {activity.length > 2 && <button title="View all activity" aria-label="View all activity" className="workspace-icon-button" onClick={props.onViewActivity}><ArrowRight size={18} /></button>}
            </div>
            {!loading && activity.length === 0 && <p className="workspace-muted-empty">No activity yet.</p>}
            {activity.map((item) => <button className="workspace-activity-row" key={item.id} onClick={() => item.notification ? props.onOpenNotification(item.notification) : onOpenAgreement(item.agreementId)}>
              <span className={`workspace-activity-icon ${item.signed ? "signed" : "pending"}`}>{item.signed ? <CheckCircle2 size={22} /> : <MessageCircle size={22} />}</span>
              <span className="workspace-activity-text">{item.text}</span><time dateTime={item.createdAt}>{workspaceDate(item.createdAt)}</time>
            </button>)}
          </div>
          <div className="workspace-elephant">
            <img src={elephant} alt="Elephant, your SPLIT guide" width="124" height="108" />
            <div><strong>Elephant</strong><span className="workspace-private"><LockKeyhole size={16} />Private</span></div>
            <button className="workspace-icon-button" title="Open Elephant private guide" aria-label="Open Elephant private guide" onClick={() => setGuideOpen(true)}><MessageCircle size={23} /></button>
          </div>
        </section>
      </div>
      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Elephant</SheetTitle><SheetDescription>Private workspace overview. Nothing is posted to your conversations.</SheetDescription></SheetHeader>
          <img src={elephant} alt="" className="my-6 h-24 w-auto" />
          <h3 className="text-base font-bold">{loading ? "Loading workspace..." : props.loadError ? "Workspace could not refresh" : counts.attention ? `${counts.attention} split ${counts.attention === 1 ? "needs" : "sheets need"} attention` : "You're all caught up"}</h3>
          <div className="mt-4 divide-y divide-border">
            {records.filter((record) => record.pending).map((record) => <button key={record.agreement.id} onClick={() => { setGuideOpen(false); openRecord(record); }} className="flex w-full items-center justify-between gap-3 py-4 text-left">
              <span className="min-w-0"><span className="block break-words font-semibold">{record.agreement.title}</span><span className="mt-1 block text-sm text-muted-foreground">{record.actionLabel}</span></span><ArrowRight size={18} className="shrink-0" />
            </button>)}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted-foreground">{counts.signed} signed {counts.signed === 1 ? "record" : "records"}. {counts.drafts} {counts.drafts === 1 ? "draft" : "drafts"}.</p>
          <button className="workspace-action mt-4" onClick={() => { setGuideOpen(false); setFilter(counts.drafts ? "drafts" : "signed"); }}>{counts.drafts ? "View drafts" : "View signed records"}<ArrowRight size={18} /></button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function WorkspaceRow({ record, onOpen, onView }: { record: WorkspaceRecord; onOpen: () => void; onView: () => void }) {
  const { agreement, allocations } = record;
  const names = allocations.map((item) => item.name);
  const total = allocations.reduce((sum, item) => sum + Math.max(0, item.percent), 0);
  const validTotal = Math.abs(total - 100) < 0.01 && allocations.every((item) => item.percent >= 0 && item.percent <= 100);
  const statusIcon = record.signed ? <CheckCircle2 size={19} /> : record.pending ? <CircleAlert size={18} /> : <FileText size={17} />;
  return <div role="row" className={`workspace-table-row ${record.pending ? "needs-attention" : ""}`}>
    <div role="cell" className="workspace-work-cell"><span className="workspace-work-icon"><Music2 size={27} /></span><div className="min-w-0"><button className="workspace-work-title" onClick={onView}>{agreement.title}</button><p>{record.artist}</p></div></div>
    <div role="cell" className="workspace-collaborators"><div className="workspace-avatars" aria-hidden="true">{names.slice(0, 2).map((name, index) => <span key={`${name}-${index}`}>{workspaceInitials(name)}</span>)}</div><div className="workspace-party-names">{names.slice(0, 2).map((name, index) => <span key={`${name}-${index}`}>{name}</span>)}{names.length > 2 && <span>+{names.length - 2} more</span>}</div></div>
    <div role="cell" className="workspace-ownership" aria-label={`Ownership: ${allocations.map((item) => `${item.name} ${item.percent}%`).join(", ")}`}>
      <div className="workspace-ownership-bar" aria-hidden="true">{allocations.map((item, index) => <span key={index} className={`split-allocation-${index % 5 + 1}`} style={{ width: `${total > 100 ? Math.max(0, item.percent) / total * 100 : Math.max(0, item.percent)}%` }} />)}</div>
      <div className="workspace-percentages">{allocations.length <= 2 ? allocations.map((item, index) => <span key={index}>{item.percent}%</span>) : <span>{allocations.length} collaborators</span>}</div>
      {!validTotal && <span className="workspace-allocation-warning">Total {total}%</span>}
    </div>
    <div role="cell" className="workspace-status"><span className={`workspace-status-pill ${record.signed ? "signed" : record.pending ? "pending" : ""}`}>{statusIcon}{record.label}</span><time dateTime={record.updatedAt}>{workspaceDate(record.updatedAt)}</time></div>
    <div role="cell" className="workspace-row-action"><button className={`workspace-action ${record.pending ? "primary" : ""}`} onClick={onOpen}>{record.actionLabel}<ArrowRight size={19} /></button></div>
  </div>;
}
