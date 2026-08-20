import type { Agreement } from "@/lib/splitSheetAgreement";
import { PENDING_SPLIT_STATUSES, VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";

export type DashboardQuickAccessAction = "messages" | "agreement";

export type DashboardQuickAccessKind =
  | "dispute"
  | "negotiation"
  | "signature"
  | "verified"
  | "draft"
  | "latest";

export type DashboardQuickAccessMoment = {
  id: string;
  kind: DashboardQuickAccessKind;
  label: string;
  title: string;
  detail: string;
  meta: string;
  agreement: Agreement;
  action: DashboardQuickAccessAction;
};

export type DashboardSplitSummary = {
  executed: number;
  pending: number;
  drafts: number;
  quickAccess: {
    primary: DashboardQuickAccessMoment | null;
    secondary: DashboardQuickAccessMoment[];
  };
};

export function buildDashboardSplitSummary(agreements: Agreement[], now = Date.now()): DashboardSplitSummary {
  return {
    executed: agreements.filter((agreement) => VERIFIED_SPLIT_STATUSES.includes(agreement.status)).length,
    pending: agreements.filter((agreement) => PENDING_SPLIT_STATUSES.includes(agreement.status)).length,
    drafts: agreements.filter((agreement) => agreement.status === "Draft").length,
    quickAccess: buildQuickAccessMoments(agreements, now),
  };
}

export function buildQuickAccessMoments(agreements: Agreement[], now = Date.now()): DashboardSplitSummary["quickAccess"] {
  const recent = [...agreements].sort((a, b) => agreementTimeValue(b) - agreementTimeValue(a));
  const continueAgreement =
    recent.find((agreement) =>
      ["Pending Split Approval", "Pending Collaborator Acceptance", "Revision Requested", "Amended", "Disputed"].includes(
        agreement.status,
      ),
    ) ??
    recent.find((agreement) => PENDING_SPLIT_STATUSES.includes(agreement.status)) ??
    recent[0];

  const primary = continueAgreement
    ? {
        id: `${continueAgreement.id}-continue`,
        kind: continueAgreement.status === "Disputed" ? "dispute" : "negotiation",
        label: continueAgreement.status === "Disputed" ? "Dispute thread" : "Continue negotiation",
        title: continueAgreement.title,
        detail: quickAccessDetail(continueAgreement),
        meta: formatAgreementActivityTime(continueAgreement, now),
        agreement: continueAgreement,
        action: "messages" as const,
      }
    : null;

  const secondary: DashboardQuickAccessMoment[] = [];
  const signingAgreement = recent.find((agreement) => ["Ready to Sign", "Pending Signatures"].includes(agreement.status));
  const disputeAgreement = recent.find((agreement) => ["Disputed", "Revision Requested", "Amended"].includes(agreement.status));
  const signedAgreement = recent.find((agreement) => VERIFIED_SPLIT_STATUSES.includes(agreement.status));
  const draftAgreement = recent.find((agreement) => agreement.status === "Draft");

  if (signingAgreement) {
    secondary.push({
      id: `${signingAgreement.id}-signature`,
      kind: "signature",
      label: "Ready for signature",
      title: signingAgreement.title,
      detail: "All approvals are in. Finish signatures to lock the record.",
      meta: formatAgreementActivityTime(signingAgreement, now),
      agreement: signingAgreement,
      action: "messages",
    });
  }

  if (disputeAgreement && disputeAgreement.id !== signingAgreement?.id) {
    secondary.push({
      id: `${disputeAgreement.id}-dispute`,
      kind: "dispute",
      label: disputeAgreement.status === "Disputed" ? "Dispute updated" : "Revision requested",
      title: disputeAgreement.title,
      detail: "Review the latest notes before anyone signs.",
      meta: formatAgreementActivityTime(disputeAgreement, now),
      agreement: disputeAgreement,
      action: "messages",
    });
  }

  if (signedAgreement && secondary.length < 2) {
    secondary.push({
      id: `${signedAgreement.id}-signed`,
      kind: "verified",
      label: "Recent signing",
      title: signedAgreement.title,
      detail: "Signed and stored in your split archive.",
      meta: formatAgreementActivityTime(signedAgreement, now),
      agreement: signedAgreement,
      action: "agreement",
    });
  }

  if (draftAgreement && secondary.length < 2) {
    secondary.push({
      id: `${draftAgreement.id}-draft`,
      kind: "draft",
      label: "Recent draft",
      title: draftAgreement.title,
      detail: "Keep building this split sheet before invitations go out.",
      meta: formatAgreementActivityTime(draftAgreement, now),
      agreement: draftAgreement,
      action: "agreement",
    });
  }

  const fallbackAgreement = recent.find(
    (agreement) => agreement.id !== primary?.agreement.id && !secondary.some((item) => item.agreement.id === agreement.id),
  );

  if (fallbackAgreement && secondary.length < 2) {
    secondary.push({
      id: `${fallbackAgreement.id}-latest`,
      kind: "latest",
      label: "Latest update",
      title: fallbackAgreement.title,
      detail: quickAccessDetail(fallbackAgreement),
      meta: formatAgreementActivityTime(fallbackAgreement, now),
      agreement: fallbackAgreement,
      action: "agreement",
    });
  }

  return { primary, secondary: secondary.slice(0, 2) };
}

export function quickAccessDetail(agreement: Agreement) {
  const collaborator = agreement.parties[1] ?? agreement.parties[0] ?? "Collaborator";

  if (agreement.status === "Disputed") return `${collaborator} raised a dispute. Review the thread before a new split version is signed.`;
  if (agreement.status === "Revision Requested" || agreement.status === "Amended") return `${collaborator} requested changes. Open the negotiation to compare versions.`;
  if (agreement.status === "Ready to Sign" || agreement.status === "Pending Signatures") return "All approvals are in. Finish signatures to lock the record.";
  if (agreement.status === "Pending Collaborator Acceptance") return `${collaborator} still needs to accept the invite before the split can move forward.`;
  if (agreement.status === "Pending Split Approval") return `${collaborator} has a split proposal waiting for review in Messages.`;
  if (agreement.status === "Draft") return "Draft saved. Add collaborators when you are ready to send the split sheet.";
  if (VERIFIED_SPLIT_STATUSES.includes(agreement.status)) return "Signed and stored in your split archive.";

  return "Open this split sheet to review the latest status.";
}

export function agreementTimeValue(agreement: Agreement) {
  const timestamp = Date.parse(agreement.updated || agreement.created);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function formatAgreementActivityTime(agreement: Agreement, now = Date.now()) {
  const timestamp = agreementTimeValue(agreement);
  if (!timestamp) return "Recently updated";

  const diffMs = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= 0 && diffMs < minute) return "Just now";
  if (diffMs >= 0 && diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs >= 0 && diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs >= 0 && diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}
