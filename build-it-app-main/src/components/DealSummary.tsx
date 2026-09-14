import { useId, useState } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronDown, Clock3, FileText, History, Lock, Mail, PenLine, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { compareSplitVersions, dealSummaryParticipants, type SummaryParticipantState } from "@/lib/dealSummary";
import type { NegotiationDeal, SplitVersion } from "@/lib/splitSheetNegotiation";
import { workspaceInitials } from "@/lib/workspaceOverview";
import "./deal-summary.css";

const stateIcons = { Signed: PenLine, Accepted: Check, Pending: Clock3, Invited: Mail, "Invite declined": XCircle, "Changes requested": XCircle };

function ParticipantState({ state }: { state: SummaryParticipantState }) {
  const Icon = stateIcons[state];
  const tone = state === "Signed" || state === "Accepted" ? "positive" : state === "Changes requested" || state === "Invite declined" ? "negative" : "pending";
  return <span className={`deal-person-state ${tone}`}><Icon size={12} />{state}</span>;
}

function VersionTime({ value }: { value: string }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span>Date unavailable</span>;
  return <time dateTime={value} title={date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" })}>
    {date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
  </time>;
}

export default function DealSummary({ deal, currentVersion, onOpenAgreement }: {
  deal: NegotiationDeal;
  currentVersion?: SplitVersion;
  onOpenAgreement?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const id = useId();
  const people = currentVersion ? dealSummaryParticipants(deal, currentVersion) : [];
  const approved = people.filter((person) => person.accepted).length;
  const signed = people.filter((person) => person.signed).length;
  const invited = people.filter((person) => person.state === "Invited").length;
  const total = Math.round(people.reduce((sum, person) => sum + person.percent, 0) * 100) / 100;
  const versions = deal.splitVersions.slice().sort((a, b) => a.version - b.version);
  const status = deal.status === "signed" ? "Signed" : deal.status === "invite_declined" ? "Invite declined" : invited ? "Awaiting invites" : deal.status === "ready_to_sign" ? "Ready to sign" : "Negotiating";
  const StatusIcon = deal.status === "signed" ? Lock : deal.status === "invite_declined" ? XCircle : deal.status === "ready_to_sign" ? PenLine : Clock3;

  return <aside className="deal-summary" aria-label="Deal summary" data-expanded={expanded}>
    <button type="button" className="deal-summary-mobile-toggle" aria-expanded={expanded} aria-controls={`${id}-body`} onClick={() => setExpanded((open) => !open)}>
      <FileText size={16} /><span>Deal summary</span><ChevronDown size={16} />
    </button>
    <div className="deal-summary-body" id={`${id}-body`}>
      <header className="deal-summary-header">
        <div className="deal-summary-heading"><span>Deal summary</span><span className={`deal-summary-status ${deal.status === "signed" ? "positive" : "pending"}`}><StatusIcon size={12} />{status}</span></div>
        <div className="deal-summary-title"><h2>{deal.title}</h2>{currentVersion && <span className="deal-version-badge">v{currentVersion.version}</span>}</div>
        {currentVersion && <>
          <p className="deal-summary-streams">{currentVersion.revenueStreams.filter((stream) => stream.id !== "audit").map((stream) => stream.label).join(" / ")}</p>
          <p className="deal-summary-proposer">Proposed by <strong>{currentVersion.createdBy || "Unknown collaborator"}</strong></p>
        </>}
      </header>

      {currentVersion ? <>
        <section className="deal-summary-ownership" aria-label="Ownership">
          <div className="deal-section-heading"><h3>Ownership</h3><span className={total !== 100 ? "deal-total-warning" : ""}>{total}%</span></div>
          <div className="deal-ownership-bar" aria-label={`Total allocation ${total}%`}>
            {people.map((person, index) => <span key={person.participantId} className={`split-allocation-${index % 5 + 1}`} title={`${person.name}: ${person.percent}%`}
              style={{ width: `${Math.max(0, person.percent) / Math.max(100, total) * 100}%` }} />)}
          </div>
          <ul className="deal-summary-people">
            {people.map((person, index) => <li key={person.participantId}>
              <Popover>
                <PopoverTrigger asChild><button type="button" className="deal-person-button" aria-label={`View ${person.name}'s details`} title="Collaborator details">
                  <span className={`deal-person-avatar split-allocation-${index % 5 + 1}`} aria-hidden="true">{workspaceInitials(person.name)}</span>
                  <span className="deal-person-info"><span className="deal-person-name">{person.name}</span><span className="deal-person-role">{person.role || "Collaborator"}</span></span>
                </button></PopoverTrigger>
                <PopoverContent className="deal-person-popover" align="start" aria-label={`${person.name}'s details`}>
                  <strong>{person.name}</strong><span>{person.handle || "No contact details on this record"}</span><span>{person.role || "Collaborator"}</span><ParticipantState state={person.state} />
                </PopoverContent>
              </Popover>
              <div className="deal-person-share"><strong>{person.percent}%</strong><ParticipantState state={person.state} /></div>
            </li>)}
          </ul>
        </section>

        <section className="deal-summary-progress" aria-label="Approval and signature progress">
          <div><CheckCircle2 size={15} /><span>Approvals</span><strong>{approved} of {people.length} accepted</strong></div>
          <div><PenLine size={15} /><span>Signatures</span><strong>{signed} of {people.length} signed</strong></div>
        </section>
      </> : <p className="deal-summary-empty">No proposal recorded yet.</p>}

      <section className="deal-summary-history">
        <button type="button" className="deal-history-toggle" aria-expanded={historyOpen} aria-controls={`${id}-history`} onClick={() => setHistoryOpen((open) => !open)}>
          <History size={15} /><span>Version history</span><span className="deal-history-count">{versions.length}</span><ChevronDown size={16} />
        </button>
        {historyOpen && <ol id={`${id}-history`}>
          {versions.slice().reverse().map((version, index) => {
            const previous = versions[versions.length - index - 2];
            const comparison = previous ? compareSplitVersions(previous, version) : [];
            const comparing = comparisonId === version.id;
            return <li key={version.id}>
              <div className="deal-version-heading"><span className="deal-version-badge">v{version.version}</span><strong>{version.createdBy || "Unknown collaborator"}</strong>{version.id === currentVersion?.id && <span className="deal-version-current">Current</span>}</div>
              <VersionTime value={version.createdAt} />
              <p>{version.note}</p>
              {previous && <>
                <button type="button" className="deal-compare-toggle" aria-expanded={comparing} aria-controls={`${id}-compare-${index}`} onClick={() => setComparisonId(comparing ? null : version.id)}>
                  Compare with v{previous.version}<ChevronDown size={13} />
                </button>
                {comparing && <div className="deal-version-comparison" id={`${id}-compare-${index}`}>
                  {comparison.length ? comparison.map((change) => <div key={change.id}><span>{change.name}</span><span><span>{change.before === null ? "Added" : `${change.before}%`}</span><ArrowRight size={12} aria-label="to" /><strong>{change.after === null ? "Removed" : `${change.after}%`}</strong></span></div>) : <p>No share changes.</p>}
                </div>}
              </>}
            </li>;
          })}
          {!versions.length && <li>No versions recorded yet.</li>}
        </ol>}
      </section>
      {onOpenAgreement && <footer className="deal-summary-footer"><button type="button" className="split-press" onClick={() => onOpenAgreement(deal.id)}><FileText size={16} /><span>View full split sheet</span><ArrowRight size={16} /></button></footer>}
    </div>
  </aside>;
}
