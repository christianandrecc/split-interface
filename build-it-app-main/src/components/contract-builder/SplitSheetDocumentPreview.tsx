import { ArrowLeft, CheckCircle2, Download, FileText, Save, Send, Users } from "lucide-react";
import type { UserProfile } from "@/lib/userProfile";
import type { StoredSplitSheetDocument } from "./document";
import { sumPercents } from "./types";
import {
  formatSplitSheetAuditTrail,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import { downloadSplitSheetRecord } from "@/lib/splitSheetDownload";
import { getSplitWorkflowLabel, PENDING_SPLIT_STATUSES, VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";

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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string | undefined) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function StatusPill({ status }: { status: StoredSplitSheetDocument["status"] }) {
  const verified = VERIFIED_SPLIT_STATUSES.includes(status);
  const pending = PENDING_SPLIT_STATUSES.includes(status);
  let className = "border-slate-200 bg-slate-50 text-slate-700";

  if (verified) className = "border-emerald-200 bg-emerald-50 text-emerald-700";
  else if (status === "Disputed") className = "border-red-200 bg-red-50 text-red-700";
  else if (status === "Archived") className = "border-slate-200 bg-slate-50 text-slate-600";
  else if (pending) className = "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={"inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] " + className}>
      {getSplitWorkflowLabel(status)}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

export function SplitSheetDocumentPage({ document: splitDocument, viewerProfile, compact = false }: SplitSheetDocumentPageProps) {
  const data = splitDocument.data;
  const writers = data.parties;
  const total = sumPercents(writers);
  const hasSampleFlag = data.sampleStatus !== "No sample or interpolation";
  const hasStructuredSample = data.sampleStatus === "Sample";
  const isVerifiedRecord = VERIFIED_SPLIT_STATUSES.includes(splitDocument.status) || splitDocument.status === "Archived";
  const auditItems = formatSplitSheetAuditTrail(splitDocument);

  return (
    <article
      id={compact ? undefined : "split-sheet-document"}
      className={
        compact
          ? "space-y-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900"
          : "mx-auto max-w-5xl space-y-6 rounded-[28px] border border-slate-200 bg-white p-8 text-slate-900 shadow-sm"
      }
    >
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#31598f] text-white">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isVerifiedRecord ? "SPLIT verified record" : "SPLIT beta draft"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{data.songTitle || "Untitled Work"}</h1>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {isVerifiedRecord
              ? `Verified and stored by ${viewerProfile.displayName || viewerProfile.legalName || viewerProfile.emailAddress || "SPLIT user"} as the final split record.`
              : `Created by ${viewerProfile.displayName || viewerProfile.legalName || viewerProfile.emailAddress || "SPLIT user"} as a collaborator-approved split record in progress.`}
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
            {splitDocument.verifiedAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Verified</dt>
                <dd className="font-semibold text-slate-900">{formatDate(splitDocument.verifiedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Work info</h2>
          <dl className="grid gap-3 text-sm">
            <InfoRow label="Title" value={data.songTitle} />
            <InfoRow label="Alternate title" value={data.alternateTitles} />
            <InfoRow label="Artist / project" value={data.artistProjectName || data.recordingArtist} />
            <InfoRow label="Creation date" value={formatDate(data.creationDate)} />
            <InfoRow label="Notes" value={data.workNotes} />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Sample disclosure</h2>
          <dl className="grid gap-3 text-sm">
            <InfoRow label="Contains sample" value={hasStructuredSample ? "Yes" : hasSampleFlag ? data.sampleStatus : "No"} />
            {hasStructuredSample && <InfoRow label="Sample artist" value={data.sampleOriginalArtist} />}
            {hasStructuredSample && <InfoRow label="Sample title" value={data.sampleOriginalWork} />}
            {hasStructuredSample && <InfoRow label="Seconds used" value={data.samplePortion} />}
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Collaborators & initial split</h2>
            <p className="text-sm text-slate-500">
              {isVerifiedRecord ? "Final collaborator shares from the verified split record." : "This proposal can move to approval after collaborators accept participation."}
            </p>
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
                title={splitSheetPartyDisplayName(splitDocument, party) + " - " + party.percent + "%"}
              />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Collaborator</th>
                <th className="px-4 py-3 font-semibold">Contribution</th>
                <th className="px-4 py-3 font-semibold">Share</th>
                <th className="px-4 py-3 font-semibold">Invite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {writers.map((party) => (
                <tr key={party.id}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{splitSheetPartyDisplayName(splitDocument, party)}</div>
                    <div className="text-xs text-slate-500">{party.role || "Songwriter"}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{party.contributionCategories.length ? party.contributionCategories.join(", ") : "Pending"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-950">{party.percent}%</td>
                  <td className="px-4 py-4 text-slate-600">{party.isCurrentUser ? "Creator" : party.inviteValue || party.email || "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {splitDocument.splitSignatures.length > 0 && (
        <section className="rounded-2xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Signatures</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {splitDocument.splitSignatures.map((signature) => (
              <div key={signature.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-950">{splitSheetParticipantDisplayName(splitDocument, signature.collaboratorId, signature.collaboratorName)}</span>
                  <span className={signature.status === "Signed" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
                    {signature.status}
                  </span>
                </div>
                <div className="mt-2 text-slate-600">{formatDateTime(signature.signedAt)}</div>
                {signature.signatureMethod && <div className="mt-1 text-xs text-slate-500">{signature.signatureMethod}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Audit trail</h2>
        <div className="space-y-3">
          {auditItems.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm md:grid-cols-[180px_1fr_1fr]">
              <span className="text-slate-500">{item.date}</span>
              <span className="font-semibold text-slate-900">{item.actor}</span>
              <span className="text-slate-600">{item.event}</span>
            </div>
          ))}
        </div>
      </section>
    </article>
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
  const isVerifiedRecord = VERIFIED_SPLIT_STATUSES.includes(splitDocument.status) || splitDocument.status === "Archived";

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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {isVerifiedRecord ? "Verified SPLIT Record" : "SPLIT Draft Preview"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {isVerifiedRecord
              ? "Review or download the final signed split record stored in your archive."
              : "Save this draft or start a Messages review so collaborators can negotiate and sign inside SPLIT. External contract delivery stays server-side for beta."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStore}
            disabled={stored || isVerifiedRecord}
            className={(stored ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:border-[#31598f] hover:text-[#31598f]") + " inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-default"}
          >
            {stored ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isVerifiedRecord ? "Record stored" : stored ? "Draft stored" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={!hasCollaborators || sent || isVerifiedRecord}
            className={(!hasCollaborators || sent || isVerifiedRecord ? "border-slate-200 bg-slate-100 text-slate-400" : "border-[#31598f] bg-[#31598f] text-white hover:bg-[#264772]") + " inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-default"}
          >
            {sent ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {isVerifiedRecord ? "Finalized" : hasCollaborators ? (sent ? "Messages started" : "Start Messages review") : "No collaborators"}
          </button>
          <button
            type="button"
            onClick={() => downloadSplitSheetRecord(splitDocument, viewerProfile)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#31598f] hover:text-[#31598f]"
          >
            <Download className="h-4 w-4" />
            {isVerifiedRecord ? "Download split sheet" : "Download draft"}
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
