import { partyDisplayName, type ContractData, sumPercents } from "./types";
import { Check, CircleAlert, FileText, Music, PenTool, Route, ShieldCheck, Users } from "lucide-react";

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
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function StepReview({ data }: Props) {
  const total = sumPercents(data.parties);
  const signers = data.parties.filter((p) => p.isSigner);
  const missingIpi = data.parties.filter((p) => !p.ipiNumber.trim()).length;
  const missingPro = data.parties.filter((p) => ["Unknown", "None"].includes(p.proAffiliation)).length;
  const hasClearanceIssue = data.sampleStatus !== "No sample or interpolation";
  const destinations = [
    data.exportPacket && "Export packet",
    data.sendToPRO && "Linked PRO",
    data.sendToMLC && "Linked MLC",
  ].filter(Boolean) as string[];

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Review & Propose</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Review the split sheet before sending it to writers for signature and registration approval.
      </p>

      <div className="space-y-4">
        <Section icon={Music} title="Song Identification">
          <Row label="Song Title" value={data.songTitle} />
          <Row label="Alternate Titles" value={data.alternateTitles} />
          <Row label="Composition Type" value={data.compositionType} />
          <Row label="Language" value={data.lyricLanguage} />
          <Row label="Created" value={[data.creationDate, data.creationLocation].filter(Boolean).join(" · ")} />
          <Row label="Studio" value={data.studioName} />
          <Row label="ISWC" value={data.iswc || "Pending / not provided"} />
          <Row label="Related ISRC" value={data.relatedIsrc || "Pending / not provided"} />
        </Section>

        <Section icon={Users} title="Writers & Ownership">
          <div className="mb-3 space-y-2">
            {data.parties.map((p, index) => (
              <div key={p.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium">{partyDisplayName(p)}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.role} · {p.proAffiliation === "Other" ? p.customProName || "Other PRO" : p.proAffiliation} · {p.publishingStatus}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums">{p.percent}%</span>
                <span className="sr-only">Writer {index + 1}</span>
              </div>
            ))}
          </div>
          <SplitBar splits={data.parties.map((p) => ({ name: partyDisplayName(p), percent: p.percent }))} />
          <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">Ownership total</span>
            <span className={`text-sm font-bold tabular-nums ${total === 100 ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>{total}%</span>
          </div>
        </Section>

        <Section icon={Route} title="PRO / MLC Routing">
          <Row label="Recording Artist" value={data.recordingArtist} />
          <Row label="Recording Title" value={data.recordingTitle || data.songTitle} />
          <Row label="Release Status" value={data.releaseStatus} />
          <Row label="Release Date" value={data.releaseDate || data.expectedReleaseDate || "Pending"} />
          <Row label="Distributor" value={data.distributor} />
          <Row label="Label" value={data.label} />
          <Row label="UPC" value={data.upc} />
          <Row label="Registration Contact" value={data.registrationContactType} />
          <Row label="Designated Contact" value={[data.designatedContactName, data.designatedContactEmail].filter(Boolean).join(" · ")} />
        </Section>

        <Section icon={CircleAlert} title="Clearance Flags">
          <Row label="Sample / Interpolation" value={data.sampleStatus} />
          <Row label="Clearance Status" value={data.sampleClearanceStatus} />
          {hasClearanceIssue && (
            <div className="mt-3 rounded-lg border border-[hsl(var(--split-pending)/0.3)] bg-[hsl(var(--split-pending)/0.07)] px-3 py-2 text-xs leading-5 text-muted-foreground">
              Sample or interpolation clearance is flagged. Review the clearance details before registration.
            </div>
          )}
        </Section>

        <Section icon={ShieldCheck} title="Signing Confirmation">
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-3 text-xs leading-5 text-muted-foreground">
            By signing, writers confirm the split percentages, profile metadata, contribution details, and registration/export use for this split sheet. Audit trail and signature records are included automatically.
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {destinations.length ? destinations.map((destination) => (
              <span
                key={destination}
                className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium text-primary"
              >
                <Check className="h-3 w-3" />
                {destination}
              </span>
            )) : (
              <span className="text-xs text-muted-foreground">No outside export or submission destination selected yet.</span>
            )}
          </div>
        </Section>

        <Section icon={PenTool} title="Signature & Readiness">
          <Row label="Required Signers" value={`${signers.length} of ${data.parties.length}`} />
          <Row label="All Signatures Required" value={data.requireAllSignatures ? "Yes" : "No"} />
          <Row label="Signing Order" value={data.parties.filter((p) => p.isSigner).slice().sort((a, b) => a.signingOrder - b.signingOrder).map(partyDisplayName).join(" -> ")} />
          <Row label="Missing IPI / CAE" value={missingIpi ? `${missingIpi} writer(s)` : "None"} />
          <Row label="Missing PRO / Society" value={missingPro ? `${missingPro} writer(s)` : "None"} />
          <div className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 py-3 text-xs leading-5 text-muted-foreground">
            Rights covered: underlying musical composition, lyrics, melody, music, topline, and songwriting copyright. Master ownership, artist royalties, label royalties, distribution royalties, neighboring rights, budgets, recoupment, and sync master approvals are excluded by default.
          </div>
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
