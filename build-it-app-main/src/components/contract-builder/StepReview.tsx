import { partyDisplayName, sumPercents, type ContractData, type StepId } from "./types";
import { CircleAlert, FileText, Music, Pencil, Users } from "lucide-react";

interface Props {
  data: ContractData;
  onEdit: (step: StepId) => void;
}

function Section({
  icon: Icon,
  title,
  children,
  onEdit,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <section className="border-b border-border pb-5 last:border-b-0 last:pb-0">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" onClick={onEdit} aria-label={`Edit ${title}`} className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <Pencil className="h-3.5 w-3.5" />Edit
        </button>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-4 py-1.5">
      <span className="text-xs leading-5 text-muted-foreground">{label}</span>
      <span className="break-words text-right text-sm font-medium">{value || "-"}</span>
    </div>
  );
}

export default function StepReview({ data, onEdit }: Props) {
  const total = sumPercents(data.parties);
  const hasSampleFlag = data.sampleStatus !== "No sample or interpolation";
  const hasStructuredSample = data.sampleStatus === "Sample";

  return (
    <div>
      <h1 tabIndex={-1} className="mb-6 text-2xl font-bold outline-none">Review Draft</h1>

      <div className="space-y-4">
        <Section icon={Music} title="Work" onEdit={() => onEdit("metadata")}>
          <Row label="Title" value={data.songTitle} />
          {data.alternateTitles && <Row label="Alternate Title" value={data.alternateTitles} />}
          <Row label="Artist / Project" value={data.artistProjectName || data.recordingArtist} />
          <Row label="Creation Date" value={data.creationDate} />
          {data.workNotes && <Row label="Notes" value={data.workNotes} />}
        </Section>

        <Section icon={CircleAlert} title="Sample Disclosure" onEdit={() => onEdit("clauses")}>
          <Row label="Contains Sample" value={hasStructuredSample ? "Yes" : hasSampleFlag ? data.sampleStatus : "No"} />
          {hasStructuredSample && <Row label="Sample Artist" value={data.sampleOriginalArtist} />}
          {hasStructuredSample && <Row label="Sample Title" value={data.sampleOriginalWork} />}
          {hasStructuredSample && <Row label="Seconds Used" value={data.samplePortion} />}
        </Section>

        <Section icon={Users} title="Collaborators & Initial Split" onEdit={() => onEdit("parties")}>
          <div className="mb-3 divide-y divide-border/60">
            {data.parties.map((party, index) => (
              <div key={party.id} className="flex items-center gap-3 py-3">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`} />
                <div className="min-w-0">
                  <span className="block break-words text-sm font-medium">{partyDisplayName(party)}</span>
                  <span className="text-xs text-muted-foreground">{party.role}</span>
                  {!party.isCurrentUser && <span className="block break-all text-xs text-muted-foreground">{party.inviteValue || party.email || party.phoneNumber}</span>}
                </div>
                <span className="ml-auto shrink-0 text-sm font-bold tabular-nums">{party.percent}%</span>
              </div>
            ))}
          </div>
          <SplitBar splits={data.parties.map((party) => ({ name: partyDisplayName(party), percent: party.percent }))} />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Ownership total</span>
            <span className={`text-sm font-bold tabular-nums ${total === 100 ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>{total}%</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

const ALLOCATION_COLORS = ["split-allocation-1", "split-allocation-2", "split-allocation-3", "split-allocation-4", "split-allocation-5"];

function SplitBar({ splits }: { splits: Array<{ name: string; percent: number }> }) {

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
        {splits.map((split, index) => (
          <div key={`${split.name}-${index}`} className={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} style={{ width: `${split.percent}%` }} />
        ))}
      </div>
    </div>
  );
}
