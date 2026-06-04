import { partyDisplayName, type ContractData } from "./types";
import { CheckCircle2, FileOutput, PenTool, Send, ShieldCheck } from "lucide-react";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        checked ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-primary/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 h-5 w-9 flex-shrink-0 rounded-full relative transition-colors ${
            checked ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-primary-foreground shadow-sm transition-transform ${
              checked ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function DefaultCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="w-full rounded-xl border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.07)] p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[hsl(var(--split-verified))]" />
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function SigningSummary() {
  const items = [
    "Split percentages and the 100% composition ownership total are correct.",
    "Legal/profile metadata can be used for this split sheet.",
    "Contribution details become part of the signed record.",
    "PRO, IPI/CAE, and publisher/admin routing can be included in export or registration packets.",
    "Audit trail, version history, timestamps, and signatures are included automatically.",
  ];

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
      <div className="mb-3 text-sm font-semibold text-foreground">By signing, each writer confirms:</div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StepSignatures({ data, onChange }: Props) {
  const updateSigner = (id: string, isSigner: boolean) =>
    onChange({ parties: data.parties.map((p) => (p.id === id ? { ...p, isSigner } : p)) });

  const updateOrder = (id: string, order: number) =>
    onChange({ parties: data.parties.map((p) => (p.id === id ? { ...p, signingOrder: order } : p)) });

  const signingOrderSummary = data.parties
    .filter((party) => party.isSigner)
    .slice()
    .sort((a, b) => a.signingOrder - b.signingOrder)
    .map(partyDisplayName)
    .join(" -> ");

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Signature & Export Setup</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Signing confirms the split sheet record. Choose only where the completed packet should go after signatures.
      </p>

      <div className="space-y-8">
        <section>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileOutput className="h-3.5 w-3.5" />
            Export & Submission Routing
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle
              label="Create export packet"
              desc="Generate PDF, summary, CSV, and JSON-ready metadata for the signed split sheet."
              checked={data.exportPacket}
              onChange={(value) => onChange({ exportPacket: value })}
            />
            <Toggle
              label="Require final approval before outside submission"
              desc="Every required writer gets one last review before data is sent to an outside registration account."
              checked={data.requireApprovalBeforeSubmission}
              onChange={(value) => onChange({ requireApprovalBeforeSubmission: value })}
            />
            <Toggle
              label="Send to linked PRO account"
              desc="Prepare the signed composition data for the selected writer societies."
              checked={data.sendToPRO}
              onChange={(value) => onChange({ sendToPRO: value })}
            />
            <Toggle
              label="Send to linked MLC account"
              desc="Prepare MLC-ready writer, publisher, ISWC, ISRC, and release metadata."
              checked={data.sendToMLC}
              onChange={(value) => onChange({ sendToMLC: value })}
            />
          </div>
        </section>

        <section>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <PenTool className="h-3.5 w-3.5" />
            Required Signers
          </label>
          <div className="space-y-2">
            {data.parties.map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border px-4 py-3.5 flex items-center justify-between transition-all ${
                  p.isSigner ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{partyDisplayName(p)}</div>
                  <div className="text-xs text-muted-foreground">{p.role} · {p.percent}%</div>
                </div>
                <div className="flex items-center gap-3">
                  {p.isSigner && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Order</span>
                      <input
                        type="number"
                        min={1}
                        max={data.parties.length}
                        value={p.signingOrder}
                        onChange={(e) => updateOrder(p.id, Number(e.target.value))}
                        className="w-12 rounded-md border border-border bg-background px-2 py-1 text-xs text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => updateSigner(p.id, !p.isSigner)}
                    className={`h-5 w-9 rounded-full relative transition-colors flex-shrink-0 ${
                      p.isSigner ? "bg-primary" : "bg-border"
                    }`}
                    aria-label="Toggle required signer"
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-primary-foreground shadow-sm transition-transform ${
                        p.isSigner ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Toggle
            label="Require all signatures"
            desc="The SPLIT Sheet is not final until every required writer signs."
            checked={data.requireAllSignatures}
            onChange={(value) => onChange({ requireAllSignatures: value })}
          />
          <Toggle
            label="Let writers request changes before signing"
            desc="If a writer does not agree, they can propose a structured change before signing. The split sheet stays unsigned until the revised version is accepted."
            checked={data.conditionalSignatures}
            onChange={(value) => onChange({ conditionalSignatures: value })}
          />
          <DefaultCard
            label="Signing order defaults to writer order"
            desc={`Writers sign in the order they are labeled: ${signingOrderSummary || "required writers"}. Change the order numbers above only if this sheet needs a different sequence.`}
          />
          <DefaultCard
            label="Audit trail included automatically"
            desc="Every export includes version history, timestamps, and signature records."
          />
        </section>

        <section>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Signing Confirmation
          </label>
          <SigningSummary />
        </section>

        <div className="flex gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <Send className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p>
            Master ownership, artist royalties, label royalties, distribution obligations, advances, and publishing commissions are outside this default SPLIT Sheet.
          </p>
        </div>
      </div>
    </div>
  );
}
