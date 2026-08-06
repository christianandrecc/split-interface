import { partyDisplayName, sumPercents, type ContractData } from "./types";
import { CircleAlert, FileText, Music, Users } from "lucide-react";
import { getSplitWorkflowLabel } from "@/lib/splitWorkflow";

interface Props {
  data: ContractData;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-5 py-3.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "-"}</span>
    </div>
  );
}

export default function StepReview({ data }: Props) {
  const total = sumPercents(data.parties);
  const invitedCollaborators = data.parties.filter((party) => !party.isCurrentUser);
  const hasSampleFlag = data.sampleStatus !== "No sample or interpolation";
  const hasStructuredSample = data.sampleStatus === "Sample";
  const awaitingInvitesLabel = getSplitWorkflowLabel("Pending Collaborator Acceptance");

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Review Draft</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Save this as a draft or send invitations so collaborators can confirm participation.
      </p>

      <div className="space-y-4">
        <Section icon={Music} title="Work">
          <Row label="Title" value={data.songTitle} />
          <Row label="Alternate Title" value={data.alternateTitles} />
          <Row label="Artist / Project" value={data.artistProjectName || data.recordingArtist} />
          <Row label="Creation Date" value={data.creationDate} />
          <Row label="Notes" value={data.workNotes} />
        </Section>

        <Section icon={CircleAlert} title="Sample Disclosure">
          <Row label="Contains Sample" value={hasStructuredSample ? "Yes" : hasSampleFlag ? data.sampleStatus : "No"} />
          {hasStructuredSample && <Row label="Sample Artist" value={data.sampleOriginalArtist} />}
          {hasStructuredSample && <Row label="Sample Title" value={data.sampleOriginalWork} />}
          {hasStructuredSample && <Row label="Seconds Used" value={data.samplePortion} />}
        </Section>

        <Section icon={Users} title="Collaborators & Initial Split">
          <div className="mb-3 space-y-2">
            {data.parties.map((party) => (
              <div key={party.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium">{partyDisplayName(party)}</span>
                  <span className="text-xs text-muted-foreground">
                    {party.role} · {party.contributionCategories.join(", ") || "Contribution pending"}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums">{party.percent}%</span>
              </div>
            ))}
          </div>
          <SplitBar splits={data.parties.map((party) => ({ name: partyDisplayName(party), percent: party.percent }))} />
          <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">Ownership total</span>
            <span className={`text-sm font-bold tabular-nums ${total === 100 ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>{total}%</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Sending invites moves this split to {awaitingInvitesLabel} for {invitedCollaborators.length} collaborator{invitedCollaborators.length === 1 ? "" : "s"}.
          </p>
        </Section>
      </div>
    </div>
  );
}

function SplitBar({ splits }: { splits: Array<{ name: string; percent: number }> }) {
  const colors = ["bg-primary", "bg-[hsl(var(--split-pending))]", "bg-[hsl(var(--split-amended))]", "bg-muted-foreground"];

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
        {splits.map((split, index) => (
          <div key={`${split.name}-${index}`} className={colors[index % colors.length]} style={{ width: `${split.percent}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {splits.map((split, index) => (
          <span key={`${split.name}-legend-${index}`} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${colors[index % colors.length]}`} />
            {split.name} {split.percent}%
          </span>
        ))}
      </div>
    </div>
  );
}
