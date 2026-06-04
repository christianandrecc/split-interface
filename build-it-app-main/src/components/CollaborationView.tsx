import { useState } from "react";
import { AlertTriangle, CheckCircle2, FilePenLine, History, Layers3, ShieldCheck, Split, XCircle } from "lucide-react";

const REVIEW_ITEMS = [
  {
    id: "percentages",
    label: "Writer Shares",
    summary: "Marcus requested 40% instead of 35% for his composition contribution.",
    icon: Split,
    currentSplits: [
      { name: "Jordan", percent: 45, color: "bg-primary" },
      { name: "Marcus", percent: 35, color: "bg-[hsl(var(--split-pending))]" },
      { name: "Nova", percent: 20, color: "bg-muted-foreground" },
    ],
    proposedSplits: [
      { name: "Jordan", percent: 45, color: "bg-primary" },
      { name: "Marcus", percent: 40, color: "bg-[hsl(var(--split-pending))]" },
      { name: "Nova", percent: 15, color: "bg-muted-foreground" },
    ],
  },
  {
    id: "metadata",
    label: "Registration Metadata",
    summary: "IPI/CAE, publisher routing, and ISRC fields were added for PRO/MLC export.",
    current: "ISWC pending, ISRC pending, publisher routing incomplete",
    proposed: "Marcus IPI added, ISRC marked pending, publisher contact added",
    icon: Layers3,
  },
  {
    id: "clearance",
    label: "Clearance Flags",
    summary: "The sheet now asks writers to confirm no sample or interpolation is used.",
    current: "Clearance not confirmed",
    proposed: "No sample or interpolation; public domain: no",
    icon: AlertTriangle,
  },
] as const;

const CHANGE_HISTORY = [
  "Marcus requested writer share from 35% to 40%.",
  "Jordan added IPI/CAE and publisher-admin routing fields.",
  "Nova asked that PRO/MLC submission require final writer approval.",
];

export default function CollaborationView() {
  const [selectedItem, setSelectedItem] = useState<(typeof REVIEW_ITEMS)[number]>(REVIEW_ITEMS[0]);
  const [mySplit, setMySplit] = useState("45");
  const [metadataCategory, setMetadataCategory] = useState("PRO / IPI details");
  const [metadataValue, setMetadataValue] = useState("");
  const [clearancePreference, setClearancePreference] = useState("Require all writers to confirm no sample or interpolation");
  const [showHistory, setShowHistory] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const selectedCounter = getCounterSummary(selectedItem.id, mySplit, metadataCategory, metadataValue, clearancePreference);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-5 md:px-8 md:py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Review Room</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Moonlight Sessions Split Sheet</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review writer shares, registration metadata, and clearance flags before signing or proposing an edit.
            </p>
          </div>
          <div className="rounded-lg border border-[hsl(var(--split-pending)/0.25)] bg-[hsl(var(--split-pending)/0.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--split-pending))]">
            Awaiting your response
          </div>
        </div>

        <section className="mb-5 rounded-lg border border-border bg-card p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryItem label="Type" value="Song Split Sheet" />
            <SummaryItem label="Sent by" value="Jordan Rivers" />
            <SummaryItem label="Version" value="v3 Proposed" />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 md:px-5">
            <h2 className="text-sm font-bold">What changed?</h2>
            <p className="mt-1 text-xs text-muted-foreground">Pick one item if you want to counter.</p>
          </div>

          <div className="divide-y divide-border">
            {REVIEW_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = selectedItem.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`grid w-full gap-3 px-4 py-4 text-left transition-colors md:grid-cols-[auto_1fr_auto] md:items-center md:px-5 ${
                    active ? "bg-primary/5" : "hover:bg-secondary/50"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.summary}</span>
                  </span>
                  <ChangePreview item={item} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-border bg-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Counter this item</h2>
              <p className="mt-1 text-xs text-muted-foreground">Selected: {selectedItem.label}</p>
            </div>
            <button onClick={() => setShowHistory((value) => !value)} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              <History className="h-3.5 w-3.5" />
              {showHistory ? "Hide changes" : "View prior changes"}
            </button>
          </div>

          {showHistory && (
            <div className="mb-4 rounded-lg bg-secondary/60 px-3 py-3">
              <div className="mb-2 text-xs font-bold text-foreground">Prior changes</div>
              <ul className="space-y-2">
                {CHANGE_HISTORY.map((change) => (
                  <li key={change} className="text-xs leading-5 text-muted-foreground">
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CounterControls
            selectedItem={selectedItem}
            mySplit={mySplit}
            setMySplit={(value) => {
              setMySplit(value);
              setActionStatus("");
            }}
            metadataCategory={metadataCategory}
            setMetadataCategory={(value) => {
              setMetadataCategory(value);
              setActionStatus("");
            }}
            metadataValue={metadataValue}
            setMetadataValue={(value) => {
              setMetadataValue(value);
              setActionStatus("");
            }}
            clearancePreference={clearancePreference}
            setClearancePreference={(value) => {
              setClearancePreference(value);
              setActionStatus("");
            }}
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Edits only apply to your own writer share, your own metadata, or registration safety checks.
          </p>
        </section>

        <section className="mt-5 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <ActionButton
              icon={CheckCircle2}
              label="Sign Split Sheet"
              className="bg-[hsl(var(--split-verified))] text-primary-foreground hover:opacity-90"
              onClick={() => setActionStatus("Split sheet ready for signature.")}
            />
            <ActionButton
              icon={XCircle}
              label="Decline"
              className="border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10"
              onClick={() => setActionStatus("Split sheet declined.")}
            />
            <ActionButton
              icon={FilePenLine}
              label="Propose Edit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setActionStatus(`Proposed: ${selectedCounter}.`)}
            />
          </div>
          {actionStatus && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {actionStatus}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function ChangePreview({ item }: { item: (typeof REVIEW_ITEMS)[number] }) {
  if (item.id === "percentages") {
    return (
      <span className="grid gap-2 text-xs md:w-[340px]">
        <SplitBar label="Current" splits={item.currentSplits} muted />
        <SplitBar label="Proposed" splits={item.proposedSplits} />
      </span>
    );
  }

  return (
    <span className="grid gap-2 text-xs md:w-[320px] md:grid-cols-2">
      <span className="rounded-md bg-secondary/70 px-3 py-2">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current</span>
        {item.current}
      </span>
      <span className="rounded-md bg-[hsl(var(--split-amended)/0.08)] px-3 py-2">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--split-amended))]">Proposed</span>
        {item.proposed}
      </span>
    </span>
  );
}

function SplitBar({ label, splits, muted }: { label: string; splits: Array<{ name: string; percent: number; color: string }>; muted?: boolean }) {
  return (
    <span className={`rounded-md px-3 py-2 ${muted ? "bg-secondary/70" : "bg-[hsl(var(--split-amended)/0.08)]"}`}>
      <span className={`mb-1.5 block text-[10px] font-semibold uppercase tracking-wider ${muted ? "text-muted-foreground" : "text-[hsl(var(--split-amended))]"}`}>
        {label}
      </span>
      <span className="flex h-2 overflow-hidden rounded-full bg-border">
        {splits.map((split) => (
          <span key={`${label}-${split.name}`} className={split.color} style={{ width: `${split.percent}%` }} />
        ))}
      </span>
      <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {splits.map((split) => (
          <span key={split.name} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <span className={`h-2 w-2 rounded-full ${split.color}`} />
            {split.name} {split.percent}%
          </span>
        ))}
      </span>
    </span>
  );
}

function CounterControls({
  selectedItem,
  mySplit,
  setMySplit,
  metadataCategory,
  setMetadataCategory,
  metadataValue,
  setMetadataValue,
  clearancePreference,
  setClearancePreference,
}: {
  selectedItem: (typeof REVIEW_ITEMS)[number];
  mySplit: string;
  setMySplit: (value: string) => void;
  metadataCategory: string;
  setMetadataCategory: (value: string) => void;
  metadataValue: string;
  setMetadataValue: (value: string) => void;
  clearancePreference: string;
  setClearancePreference: (value: string) => void;
}) {
  if (selectedItem.id === "percentages") {
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <label htmlFor="mySplit" className="text-xs font-semibold text-muted-foreground">
          Propose your split percentage
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="mySplit"
            type="number"
            min="0"
            max="100"
            value={mySplit}
            onChange={(event) => setMySplit(event.target.value)}
            className="h-11 w-24 rounded-lg border border-border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-sm font-semibold">%</span>
          <span className="text-xs leading-5 text-muted-foreground">Only your own writer share can be countered here.</span>
        </div>
      </div>
    );
  }

  if (selectedItem.id === "metadata") {
    const metadataOptions = ["PRO / IPI details", "MLC recording match", "Publisher / admin routing", "Require approval before submission"];

    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="grid gap-2 md:grid-cols-2">
          {metadataOptions.map((option) => (
            <button
              key={option}
              onClick={() => setMetadataCategory(option)}
              className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                metadataCategory === option ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-secondary/60"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <input
          value={metadataValue}
          onChange={(event) => setMetadataValue(event.target.value)}
          placeholder="Optional value or note for your metadata"
          className="mt-3 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
    );
  }

  const clearanceOptions = [
    "Require all writers to confirm no sample or interpolation",
    "Request sample clearance documents before registration",
    "Freeze PRO/MLC submission until clearance is resolved",
    "Accept clearance flag as proposed",
  ];

  return (
    <div className="grid gap-2">
      {clearanceOptions.map((option) => (
        <button
          key={option}
          onClick={() => setClearancePreference(option)}
          className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${
            clearancePreference === option ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-secondary/60"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function getCounterSummary(
  itemId: string,
  mySplit: string,
  metadataCategory: string,
  metadataValue: string,
  clearancePreference: string,
) {
  if (itemId === "percentages") {
    return `My writer share should be ${mySplit || "0"}%`;
  }

  if (itemId === "metadata") {
    return `${metadataCategory}${metadataValue ? `: ${metadataValue}` : ""}`;
  }

  return clearancePreference;
}

function ActionButton({
  icon: Icon,
  label,
  className,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${className}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
