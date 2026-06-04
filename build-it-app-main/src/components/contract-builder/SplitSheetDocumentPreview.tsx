import { ArrowLeft, CheckCircle2, Download, FileText, Lock, Save, Send, Users } from "lucide-react";
import type { UserProfile } from "@/components/AccountAccess";
import type { StoredSplitSheetDocument } from "./document";
import { partyDisplayName, sumPercents } from "./types";

type SplitSheetDocumentPreviewProps = {
  document: StoredSplitSheetDocument;
  viewerProfile: UserProfile;
  stored: boolean;
  sent: boolean;
  onBackToEdit: () => void;
  onStore: () => void;
  onSend: () => void;
  onDone: () => void;
};

type SplitSheetDocumentPageProps = {
  document: StoredSplitSheetDocument;
  viewerProfile: UserProfile;
  compact?: boolean;
};

function formatDate(value: string | undefined) {
  if (!value) return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string | undefined) {
  if (!value) return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function valueOrPending(value: string | number | undefined) {
  if (value === 0) return "0";
  if (!value) return "Not provided";
  return String(value);
}

function publishingProfileRows(profile: UserProfile) {
  const status = profile.publishingStatus || "Unknown";
  const isSimple = status === "Self-published" || status === "Unpublished";

  if (isSimple) {
    return [
      ["Publishing status", status],
      ["Publishing routing", status === "Self-published" ? "Self-published / self-administered" : "No publisher attached"],
      ["Writer PRO / society", profile.customProName || profile.proAffiliation || "Not provided"],
      ["Publishing share", "100% of this writers share"],
    ];
  }

  const company = profile.publisherName || profile.adminCompanyName || "Not provided";
  const ipi = profile.publisherIpi || profile.adminIpi || "Not provided";

  return [
    ["Publishing status", status],
    ["Publisher / admin", company],
    ["Publisher IPI", ipi],
    ["Publisher PRO / society", profile.publisherPro || profile.proAffiliation || "Not provided"],
    ["Publishing share", profile.publishingShare ? profile.publishingShare + "%" : "Not provided"],
    ["Admin collection share", profile.adminCollectionShare ? profile.adminCollectionShare + "%" : "Not provided"],
    ["Publisher contact", profile.publisherContact || "Private account record"],
  ];
}

function StatusPill({ status }: { status: StoredSplitSheetDocument["status"] }) {
  const className =
    status === "Executed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Pending Signatures"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={"inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] " + className}>
      {status}
    </span>
  );
}

export function SplitSheetDocumentPage({ document: splitDocument, viewerProfile, compact = false }: SplitSheetDocumentPageProps) {
  const data = splitDocument.data;
  const writers = data.parties;
  const total = sumPercents(writers);
  const exportDestinations = [
    data.exportPacket ? "Registration export packet" : "",
    data.sendToPRO ? "Linked PRO account" : "",
    data.sendToMLC ? "Linked MLC account" : "",
  ].filter(Boolean);

  return (
    <article
      id={compact ? undefined : "split-sheet-document"}
      className={
        compact
          ? "space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900"
          : "mx-auto max-w-5xl space-y-8 rounded-[28px] border border-slate-200 bg-white p-8 text-slate-900 shadow-sm"
      }
    >
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#31598f] text-white">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Composition ownership split sheet</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{data.songTitle || "Untitled Song"}</h1>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            This document records composition ownership shares, writer identity, contribution details, signature order, and account-linked registration metadata for PRO and MLC routing.
          </p>
        </div>

        <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="mb-3 flex justify-end">
            <StatusPill status={splitDocument.status} />
          </div>
          <dl className="space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Document</dt>
              <dd className="font-semibold text-slate-900">{splitDocument.documentNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Version</dt>
              <dd className="font-semibold text-slate-900">v{splitDocument.version}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="font-semibold text-slate-900">{formatDate(splitDocument.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Song information</h2>
          <dl className="grid gap-3 text-sm">
            <InfoRow label="Primary title" value={data.songTitle || "Not provided"} />
            <InfoRow label="Alternative titles" value={data.alternateTitles || "None listed"} />
            <InfoRow label="Lyrics language" value={data.lyricLanguage || "Not provided"} />
            <InfoRow label="Creation date" value={formatDate(data.creationDate)} />
            <InfoRow label="Creation location" value={data.creationLocation || "Not provided"} />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Advanced registration fields</h2>
          <dl className="grid gap-3 text-sm">
            <InfoRow label="ISWC" value={data.iswc || "Available after registration"} />
            <InfoRow label="Related ISRC" value={data.relatedIsrc || "Available if recording exists"} />
            <InfoRow label="Studio" value={data.studioName || "Not provided"} />
            <InfoRow label="Recording match" value={[data.recordingArtist, data.recordingTitle].filter(Boolean).join(" - ") || "Not attached"} />
            <InfoRow label="Export routing" value={exportDestinations.length ? exportDestinations.join(", ") : "Manual review only"} />
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Writer ownership</h2>
            <p className="text-sm text-slate-500">Composition ownership must total 100% before signing.</p>
          </div>
          <span className={total === 100 ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700"}>
            Total: {total}%
          </span>
        </div>

        <div className="mb-6 overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-4 w-full">
            {writers.map((party, index) => (
              <div
                key={party.id}
                className={["bg-[#31598f]", "bg-[#e0a63a]", "bg-[#2f8f7b]", "bg-[#8a5fbf]", "bg-[#cc6f4d]"][index % 5]}
                style={{ width: party.percent + "%" }}
                title={partyDisplayName(party) + " - " + party.percent + "%"}
              />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Writer</th>
                <th className="px-4 py-3 font-semibold">Contribution</th>
                <th className="px-4 py-3 font-semibold">Share</th>
                <th className="px-4 py-3 font-semibold">PRO</th>
                <th className="px-4 py-3 font-semibold">IPI/CAE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {writers.map((party) => (
                <tr key={party.id}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{partyDisplayName(party)}</div>
                    <div className="text-xs text-slate-500">{party.role || "Songwriter"}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{party.contributionCategories.length ? party.contributionCategories.join(", ") : "Not specified"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-950">{party.percent}%</td>
                  <td className="px-4 py-4 text-slate-600">{party.customProName || party.proAffiliation || "Not provided"}</td>
                  <td className="px-4 py-4 text-slate-600">{party.ipiNumber || "Missing"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="mb-5 flex items-start gap-3">
          <span className="mt-1 rounded-full bg-white p-2 text-emerald-700">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Private publishing appendix</h2>
            <p className="text-sm leading-6 text-slate-600">
              SPLIT can include publishing routing from each users account in the final registration export. Only your own publishing details are visible in this preview.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {writers.map((party) => {
            const isViewer = party.isCurrentUser || party.email === viewerProfile.emailAddress;

            return (
              <div key={party.id} className="rounded-2xl border border-emerald-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-950">{partyDisplayName(party)}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {isViewer ? "Visible to you" : "Private"}
                  </span>
                </div>

                {isViewer ? (
                  <dl className="space-y-2 text-sm">
                    {publishingProfileRows(viewerProfile).map(([label, value]) => (
                      <InfoRow key={label} label={label} value={value} />
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    Publishing company, publisher IPI, admin percentages, and deal routing stay censored here. SPLIT uses that private account data only for authorized registration export after signing.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Signing settings</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>Required signatures: {data.requireAllSignatures ? "All listed writers" : "Selected writers only"}</p>
            <p>Signing order: writer order unless changed in the signing step.</p>
            <p>Requested changes before signing: {data.conditionalSignatures ? "Allowed" : "Off"}</p>
            <p>Audit trail: included automatically in every export.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Signature blocks</h2>
          <div className="space-y-3">
            {writers.map((party) => (
              <div key={party.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-950">{partyDisplayName(party)}</span>
                <span className="text-slate-500">Order {party.signingOrder}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Audit trail</h2>
        <div className="space-y-3">
          {splitDocument.auditTrail.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm md:grid-cols-[180px_1fr_1fr]">
              <span className="text-slate-500">{formatDateTime(item.timestamp)}</span>
              <span className="font-semibold text-slate-900">{item.actor}</span>
              <span className="text-slate-600">{item.action}</span>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{valueOrPending(value)}</dd>
    </div>
  );
}

export default function SplitSheetDocumentPreview({
  document: splitDocument,
  viewerProfile,
  stored,
  sent,
  onBackToEdit,
  onStore,
  onSend,
  onDone,
}: SplitSheetDocumentPreviewProps) {
  const hasCollaborators = splitDocument.collaborators.length > 0;

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-6 text-slate-900 sm:px-8 lg:px-12">
      <style>
        {"@media print { body * { visibility: hidden; } #split-sheet-document, #split-sheet-document * { visibility: visible; } #split-sheet-document { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: 0; } .no-print { display: none !important; } }"}
      </style>

      <div className="no-print mx-auto mb-6 flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={onBackToEdit}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to edit
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">PDF Preview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review the SPLIT Sheet before saving it to your account or sending it to collaborators.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStore}
            disabled={stored}
            className={(stored ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:border-[#31598f] hover:text-[#31598f]") + " inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-default"}
          >
            {stored ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {stored ? "Stored" : "Store in account"}
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={!hasCollaborators || sent}
            className={(!hasCollaborators || sent ? "border-slate-200 bg-slate-100 text-slate-400" : "border-[#31598f] bg-[#31598f] text-white hover:bg-[#264772]") + " inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-default"}
          >
            {sent ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {hasCollaborators ? (sent ? "Sent" : "Send to collaborators") : "No collaborators"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#31598f] hover:text-[#31598f]"
          >
            <Download className="h-4 w-4" />
            Print / Save PDF
          </button>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Users className="h-4 w-4" />
            Done
          </button>
        </div>
      </div>

      <SplitSheetDocumentPage document={splitDocument} viewerProfile={viewerProfile} />
    </div>
  );
}
