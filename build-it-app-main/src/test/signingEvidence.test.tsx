import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeSignedDocument } from "@/test/fixtures/splitSheet";
import { splitSigningEvidence } from "@/lib/splitSigningEvidence";
import { buildSplitSheetPdfModel, supportingFields } from "@/lib/splitSheetPdfModel";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import AgreementDetail from "@/components/AgreementDetail";
import CollaborationView from "@/components/CollaborationView";
import { DEFAULT_CONTRACT } from "@/components/contract-builder/types";

vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock("@/lib/splitSheetDownload", () => ({ downloadSplitSheetRecord: vi.fn() }));

describe("account-bound signing evidence", () => {
  it("confirms legitimate current signatures and keeps aliases bound to the same accounts", () => {
    const doc = makeSignedDocument();
    doc.splitSignatures[0].collaboratorId = "creator-party";
    doc.splitSignatures[1].collaboratorId = "maya-party";
    const evidence = splitSigningEvidence(doc, "server");
    expect(evidence).toMatchObject({ signed: true, verified: true, signedCount: 2 });
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile, undefined, "server")).toMatchObject({ signed: true, verified: true, signedCount: 2 });
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} />);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByText("All signed")).toBeInTheDocument();
  });

  it.each([
    ["missing account", (doc: ReturnType<typeof makeSignedDocument>) => { delete doc.splitSignatures[0].signerUserId; }],
    ["wrong account", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitSignatures[0].signerUserId = "unrelated-account"; }],
    ["missing name", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitSignatures[0].signerLegalName = " "; }],
    ["unknown method", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitSignatures[0].signatureMethod = "Imported mark"; }],
    ["synthetic legacy method", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitSignatures[0].signatureMethod = "SPLIT beta acknowledgement"; }],
    ["invalid time", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitSignatures[0].signedAt = "not-a-time"; }],
    ["stale proposal", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitSignatures[0].proposalVersionId = "old"; }],
    ["duplicate signature", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitSignatures.push({ ...doc.splitSignatures[0], id: "duplicate" }); }],
    ["ambiguous membership", (doc: ReturnType<typeof makeSignedDocument>) => { doc.collaboratorInvites[0].collaboratorUserId = doc.creatorUserId; }],
    ["missing revision", (doc: ReturnType<typeof makeSignedDocument>) => { delete doc.serverRevision; }],
    ["duplicate current proposal", (doc: ReturnType<typeof makeSignedDocument>) => { doc.splitProposalVersions.push({ ...doc.splitProposalVersions[0] }); }],
    ["reserved invite identity", (doc: ReturnType<typeof makeSignedDocument>) => { doc.collaboratorInvites[0].id = "creator"; }],
  ] as const)("does not certify %s in model or UI; preserves the original", (_, change) => {
    const doc = makeSignedDocument(); change(doc); const before = JSON.stringify(doc);
    const evidence = splitSigningEvidence(doc, "server");
    expect(evidence.signed).toBe(false); expect(evidence.signedCount).toBeLessThan(2);
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile, undefined, "server").verified).toBe(false);
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} />);
    expect(screen.getByText("Evidence incomplete")).toBeInTheDocument();
    expect(screen.queryByText("All signed")).not.toBeInTheDocument();
    expect(JSON.stringify(doc)).toBe(before);
  });

  it("never certifies local copies even when they carry server-shaped metadata", () => {
    const doc = makeSignedDocument();
    expect(splitSigningEvidence(doc)).toMatchObject({ signed: false, verified: false, signedCount: 0 });
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile)).toMatchObject({ signed: false, signedCount: 0, source: "local" });
  });

  it("does not turn final status or accepted invitations into recorded signatures or approvals", () => {
    const doc = makeSignedDocument(); doc.splitSignatures = []; doc.splitApprovals = [];
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} />);
    expect(screen.getByText("0 / 2")).toBeInTheDocument();
    expect(screen.queryByText("All signed")).not.toBeInTheDocument();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
    expect(screen.getAllByText("Not recorded")).toHaveLength(2);
  });

  it("does not match a stranger's signature by display name", () => {
    const doc = makeSignedDocument(); doc.splitSignatures[1].collaboratorId = "stranger";
    doc.splitSignatures[1].collaboratorName = "Maya Rios";
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.queryByText("All signed")).not.toBeInTheDocument();
  });

  it("does not certify conflicting approval records or rounded allocations", () => {
    const doc = makeSignedDocument();
    doc.splitApprovals.push({ ...doc.splitApprovals[0], id: "conflict", status: "Rejected" });
    expect(splitSigningEvidence(doc, "server").signed).toBe(false);
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile, undefined, "server").people[0].approved).toBe(false);
    const rounded = makeSignedDocument();
    rounded.splitProposalVersions[0].allocations[0].percentage = 50.001;
    expect(splitSigningEvidence(rounded, "server").signed).toBe(false);
  });

  it("retains recorded order metadata but describes the actual any-order behavior", () => {
    const doc = makeSignedDocument(); doc.data.signingOrderEnabled = true;
    const before = JSON.stringify(doc);
    const fields = supportingFields(buildSplitSheetPdfModel(doc, doc.creatorProfile, undefined, "server")).flatMap(group => group.fields);
    expect(fields).toContainEqual(["Signing sequence", "Any order after all approvals"]);
    expect(fields).toContainEqual(["Recorded signing-order setting", "Yes (not enforced)"]);
    expect(JSON.stringify(doc)).toBe(before); expect(DEFAULT_CONTRACT.signingOrderEnabled).toBe(false);
  });

  it("routes a missing signing name to profile completion without submitting a signature", () => {
    const doc = makeSignedDocument(); doc.status = "Ready to Sign"; delete doc.verifiedAt;
    doc.splitSignatures = [];
    const profile = { ...doc.creatorProfile, authUserId: doc.creatorUserId!, legalName: "", legalFirstName: "", legalLastName: "" };
    const onUpdateDocument = vi.fn(); const onCompleteSigningIdentity = vi.fn();
    render(<CollaborationView documents={[doc]} userProfile={profile} onUpdateDocument={onUpdateDocument} onCompleteSigningIdentity={onCompleteSigningIdentity} />);
    expect(screen.queryByRole("button", { name: "Sign" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete signing details" }));
    expect(onCompleteSigningIdentity).toHaveBeenCalledOnce(); expect(onUpdateDocument).not.toHaveBeenCalled();
  });
});
