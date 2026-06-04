import React, { useState } from "react";
import { Agreement, StatusBadge, AgreementIcon } from "@/components/Dashboard";
import { SplitSheetDocumentPage } from "@/components/contract-builder/SplitSheetDocumentPreview";
import {
  Shield,
  GitBranch,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  ChevronDown,
  ChevronUp,
  PenLine,
  Download,
} from "lucide-react";

const FAKE_AUDIT: { date: string; event: string; actor: string }[] = [
  { date: "2025-01-14", event: "Split sheet executed (v3)", actor: "All writers" },
  { date: "2025-01-10", event: "Writer share amendment submitted", actor: "Jordan Rivers" },
  { date: "2024-12-20", event: "Registration metadata approved", actor: "Marcus Webb" },
  { date: "2024-12-18", event: "Signature requested", actor: "Jordan Rivers" },
  { date: "2024-11-15", event: "Split sheet created (v1)", actor: "Jordan Rivers" },
];

const FAKE_VERSIONS = [
  { version: 3, date: "2025-01-10", note: "IPI and publisher routing added", active: true },
  { version: 2, date: "2024-12-05", note: "Writer split adjusted after review", active: false },
  { version: 1, date: "2024-11-02", note: "Initial draft", active: false },
];

const FAKE_HASH = "sha256:a3f9b2c1d8e47f6a9b0c3d5e7f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8";

export default function AgreementDetail({ agreement }: { agreement: Agreement }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const totalPercent = agreement.splits.reduce((s, p) => s + p.percent, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 mb-6">
        <div className="flex items-start gap-3">
          <AgreementIcon type={agreement.type} />
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight leading-tight">{agreement.title}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={agreement.status} />
              <span className="text-xs text-muted-foreground">v{agreement.version}</span>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">{agreement.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export Packet
          </button>
          <button className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors">
            <PenLine className="h-3.5 w-3.5" />
            Sign
          </button>
        </div>
      </div>

      {/* Execution banner */}
      <VerificationBanner status={agreement.status} hash={FAKE_HASH} />

      {agreement.document && (
        <div className="mt-6">
          <SplitSheetDocumentPage document={agreement.document} viewerProfile={agreement.document.creatorProfile} compact />
        </div>
      )}

      <div className="mt-6 space-y-4">
        {/* Parties */}
        <Section title="Writers" icon={Users}>
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {agreement.parties.map((party, i) => {
              const split = agreement.splits.find((s) => s.name === party);
              return (
                <div key={i} className="flex items-center justify-between px-3 md:px-4 py-3 bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {party.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{party}</div>
                      {split && <div className="text-xs text-muted-foreground">{split.role}</div>}
                    </div>
                  </div>
                  <SignatureStatus index={i} status={agreement.status} />
                </div>
              );
            })}
          </div>
        </Section>

        {/* Splits */}
        <Section title="Ownership Splits" icon={FileText}>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="px-3 md:px-4 py-2.5 bg-secondary/50 flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <span className="flex-1">Writer</span>
              <span className="w-16 md:w-20 text-center">Role</span>
              <span className="w-14 md:w-20 text-right">Share</span>
            </div>
            {agreement.splits.map((split, i) => (
              <div key={i} className="flex items-center px-3 md:px-4 py-3 border-b border-border last:border-b-0">
                <div className="flex-1 text-sm font-medium truncate">{split.name}</div>
                <div className="w-16 md:w-20 text-center">
                  <span className="text-[10px] md:text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{split.role}</span>
                </div>
                <div className="w-14 md:w-20 text-right">
                  <span className="text-sm font-bold tabular-nums">{split.percent}%</span>
                </div>
              </div>
            ))}
            <div className="flex items-center px-3 md:px-4 py-2.5 border-t border-border bg-secondary/30">
              <div className="flex-1 text-xs font-semibold text-muted-foreground">Total</div>
              <div className={`text-sm font-bold tabular-nums ${totalPercent === 100 ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>
                {totalPercent}%
              </div>
            </div>
          </div>
          <div className="mt-3">
            <SplitBar splits={agreement.splits} />
          </div>
        </Section>

        {/* Metadata */}
        <Section title="Split Sheet Details" icon={Hash}>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <MetaCell label="Created" value={agreement.created} />
            <MetaCell label="Last Updated" value={agreement.updated} />
            <MetaCell label="Version" value={`v${agreement.version}`} />
            <MetaCell label="Type" value={agreement.type} />
          </div>
          <div className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 md:px-4 py-2.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Version Hash</div>
            <div className="text-[10px] md:text-[11px] font-mono text-foreground/70 break-all leading-relaxed">{FAKE_HASH}</div>
          </div>
        </Section>

        {/* Version History */}
        <CollapsibleSection title="Version History" icon={GitBranch} open={showHistory} onToggle={() => setShowHistory((v) => !v)} count={FAKE_VERSIONS.length}>
          <div className="space-y-2">
            {FAKE_VERSIONS.map((v) => (
              <div key={v.version} className={`flex items-start gap-3 rounded-lg px-3 md:px-4 py-3 border ${v.active ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${v.active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">v{v.version}</span>
                    {v.active && <span className="text-[10px] text-[hsl(var(--split-verified))] font-semibold bg-[hsl(var(--split-verified)/0.1)] rounded-full px-2 py-0.5">Current</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{v.note}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1">{v.date}</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Audit Trail */}
        <CollapsibleSection title="Audit Trail" icon={Clock} open={showAudit} onToggle={() => setShowAudit((v) => !v)} count={FAKE_AUDIT.length}>
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {FAKE_AUDIT.map((entry, i) => (
              <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                <div className="absolute -left-4 mt-0.5 h-3.5 w-3.5 rounded-full border-2 border-border bg-background flex-shrink-0" />
                <div className="ml-2 min-w-0">
                  <div className="text-xs font-medium text-foreground">{entry.event}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{entry.actor} · {entry.date}</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

function VerificationBanner({ status, hash }: { status: Agreement["status"]; hash: string }) {
  if (status === "Executed") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--split-verified)/0.3)] bg-[hsl(var(--split-verified)/0.07)] px-3 md:px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--split-verified))] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[hsl(var(--split-verified))]">Executed & Registration Ready</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">All writers signed. PRO/MLC export metadata is ready for review.</div>
        </div>
        <Shield className="h-4 w-4 text-[hsl(var(--split-verified)/0.5)] flex-shrink-0 hidden md:block" />
      </div>
    );
  }
  if (status === "Pending Signatures") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--split-pending)/0.3)] bg-[hsl(var(--split-pending)/0.07)] px-3 md:px-4 py-3">
        <AlertCircle className="h-4 w-4 text-[hsl(var(--split-pending))] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[hsl(var(--split-pending))]">Awaiting Signatures</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">One or more writers have not yet signed.</div>
        </div>
      </div>
    );
  }
  if (status === "Draft") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 md:px-4 py-3">
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground">Draft</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">This split sheet has not been sent for signatures yet.</div>
        </div>
      </div>
    );
  }
  return null;
}

function SignatureStatus({ index, status }: { index: number; status: Agreement["status"] }) {
  if (status === "Executed") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--split-verified))]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Signed
      </div>
    );
  }
  if (status === "Pending Signatures" && index === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--split-verified))]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Signed
      </div>
    );
  }
  if (status === "Pending Signatures") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--split-pending))]">
        <AlertCircle className="h-3.5 w-3.5" />
        Pending
      </div>
    );
  }
  return <div className="text-[11px] text-muted-foreground">—</div>;
}

function SplitBar({ splits }: { splits: { name: string; percent: number }[] }) {
  const COLORS = ["bg-primary", "bg-[hsl(var(--split-pending))]", "bg-[hsl(var(--split-amended))]", "bg-muted-foreground"];
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2 gap-[2px]">
        {splits.map((s, i) => (
          <div key={i} className={`${COLORS[i % COLORS.length]} transition-all`} style={{ width: `${s.percent}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 md:gap-3 mt-2">
        {splits.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${COLORS[i % COLORS.length]} inline-block`} />
            {s.name} ({s.percent}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 md:px-4 py-2.5 md:py-3">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xs md:text-sm font-medium">{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, open, onToggle, count, children }: { title: string; icon: React.ElementType; open: boolean; onToggle: () => void; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 md:px-4 py-3.5 hover:bg-secondary/30 transition-colors">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">{title}</span>
        <span className="text-[10px] text-muted-foreground mr-2">{count} entries</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 md:px-4 pb-4 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
