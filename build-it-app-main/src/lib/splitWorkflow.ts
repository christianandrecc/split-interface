export type SplitWorkflowStageId =
  | "draft"
  | "awaiting-invites"
  | "reviewing"
  | "awaiting-signatures"
  | "in-dispute"
  | "revised"
  | "fully-signed"
  | "archived";

export const SPLIT_WORKFLOW_STAGES: Array<{
  id: SplitWorkflowStageId;
  label: string;
  statuses: string[];
}> = [
  { id: "draft", label: "Draft", statuses: ["Draft"] },
  { id: "awaiting-invites", label: "Awaiting Invites", statuses: ["Pending Collaborator Acceptance"] },
  { id: "reviewing", label: "Reviewing Agreement", statuses: ["Pending Split Approval"] },
  { id: "awaiting-signatures", label: "Awaiting Signatures", statuses: ["Ready to Sign", "Pending Signatures"] },
  { id: "in-dispute", label: "In Dispute", statuses: ["Disputed"] },
  { id: "revised", label: "Revised", statuses: ["Revision Requested", "Amended"] },
  { id: "fully-signed", label: "Fully Signed", statuses: ["Fully Signed", "Verified and Stored", "Executed"] },
  { id: "archived", label: "Archived", statuses: ["Archived"] },
];

export const PENDING_SPLIT_STATUSES = SPLIT_WORKFLOW_STAGES
  .filter((stage) => !["draft", "fully-signed", "archived"].includes(stage.id))
  .flatMap((stage) => stage.statuses);

export const VERIFIED_SPLIT_STATUSES = SPLIT_WORKFLOW_STAGES.find((stage) => stage.id === "fully-signed")?.statuses ?? [];

export function getSplitWorkflowStage(status: string) {
  return SPLIT_WORKFLOW_STAGES.find((stage) => stage.statuses.includes(status)) ?? SPLIT_WORKFLOW_STAGES[0];
}

export function getSplitWorkflowStageById(stageId: SplitWorkflowStageId) {
  return SPLIT_WORKFLOW_STAGES.find((stage) => stage.id === stageId) ?? SPLIT_WORKFLOW_STAGES[0];
}

export function getSplitWorkflowLabel(status: string) {
  return getSplitWorkflowStage(status).label;
}
