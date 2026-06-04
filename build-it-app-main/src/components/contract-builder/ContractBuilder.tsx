import React, { useState, useCallback } from "react";
import splitLogo from "@/assets/split-logo.png";
import { ArrowLeft } from "lucide-react";
import ProgressTracker from "./ProgressTracker";
import StepMetadata from "./StepMetadata";
import StepParties from "./StepParties";
import StepRights from "./StepRights";
import StepClauses from "./StepClauses";
import StepSignatures from "./StepSignatures";
import StepReview from "./StepReview";
import SplitSheetDocumentPreview from "./SplitSheetDocumentPreview";
import { createSplitSheetDocument, addDocumentAuditTrail, type StoredSplitSheetDocument } from "./document";
import { UserProfile } from "@/components/AccountAccess";
import {
  STEPS,
  type StepId,
  type ContractData,
  type Party,
  DEFAULT_CONTRACT,
  makeParty,
  sumPercents,
  isWriterReady,
} from "./types";
import { toast } from "sonner";

export default function ContractBuilder({
  userProfile,
  onBack,
  onStoreDocument,
  onSendDocument,
}: {
  userProfile: UserProfile;
  onBack: () => void;
  onStoreDocument: (document: StoredSplitSheetDocument) => void;
  onSendDocument: (document: StoredSplitSheetDocument) => void;
}) {
  const [step, setStep] = useState<StepId>("metadata");
  const [data, setData] = useState<ContractData>(() => createInitialContract(userProfile));
  const [generatedDocument, setGeneratedDocument] = useState<StoredSplitSheetDocument | null>(null);
  const [documentStored, setDocumentStored] = useState(false);
  const [documentSent, setDocumentSent] = useState(false);

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const isSongStep = step === "metadata";

  const update = useCallback(
    (partial: Partial<ContractData>) => setData((prev) => ({ ...prev, ...partial })),
    []
  );

  const canContinue = (): boolean => {
    const writersReady = data.parties.every(isWriterReady);
    switch (step) {
      case "metadata": return !!(data.songTitle.trim() && data.compositionType);
      case "parties": return data.parties.length >= 1 && writersReady && Math.abs(sumPercents(data.parties) - 100) < 0.01;
      case "rights": return !!data.registrationContactType;
      case "clauses": return !!data.sampleStatus;
      case "signatures": return data.parties.some((p) => p.isSigner);
      case "review": return true;
      default: return false;
    }
  };

  const next = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].id); };
  const prev = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].id); };

  const handlePropose = () => {
    const document = createSplitSheetDocument(data, userProfile);
    setGeneratedDocument(document);
    setDocumentStored(false);
    setDocumentSent(false);
    toast.success("SPLIT Sheet preview generated", { description: data.songTitle || "Untitled Song" });
  };

  const handleStoreGeneratedDocument = () => {
    if (!generatedDocument) return;

    const storedDocument = addDocumentAuditTrail(
      {
        ...generatedDocument,
        status: "Draft",
        storedAt: generatedDocument.storedAt || new Date().toISOString(),
      },
      userProfile.emailAddress || userProfile.legalName || "SPLIT user",
      "Stored in account",
    );

    setGeneratedDocument(storedDocument);
    setDocumentStored(true);
    onStoreDocument(storedDocument);
    toast.success("SPLIT Sheet stored in your account");
  };

  const handleSendGeneratedDocument = () => {
    if (!generatedDocument) return;

    const sentDocument = addDocumentAuditTrail(
      {
        ...generatedDocument,
        status: generatedDocument.collaborators.length ? "Pending Signatures" : "Executed",
        storedAt: generatedDocument.storedAt || new Date().toISOString(),
        sentAt: new Date().toISOString(),
      },
      userProfile.emailAddress || userProfile.legalName || "SPLIT user",
      generatedDocument.collaborators.length ? "Sent to collaborators" : "Marked ready for solo writer",
    );

    setGeneratedDocument(sentDocument);
    setDocumentStored(true);
    setDocumentSent(true);
    onSendDocument(sentDocument);
    toast.success(generatedDocument.collaborators.length ? "SPLIT Sheet sent to collaborators" : "Solo SPLIT Sheet is ready");
  };

  if (generatedDocument) {
    return (
      <SplitSheetDocumentPreview
        document={generatedDocument}
        viewerProfile={userProfile}
        stored={documentStored}
        sent={documentSent}
        onBackToEdit={() => setGeneratedDocument(null)}
        onStore={handleStoreGeneratedDocument}
        onSend={handleSendGeneratedDocument}
        onDone={onBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col safe-top safe-bottom">
      {/* Header */}
      <header className="h-[56px] md:h-[60px] border-b border-border flex items-center px-4 md:px-6 gap-3 md:gap-4 flex-shrink-0 bg-background">
        <img src={splitLogo} alt="SPLIT" className="h-6 w-6 hidden md:block" />
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Back</span>
        </button>
        <div className="h-5 w-px bg-border hidden md:block" />
        <span className="text-sm font-semibold">New SPLIT Sheet</span>
        <div className="ml-auto overflow-x-auto">
          <ProgressTracker current={step} onNavigate={setStep} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={`mx-auto w-full px-4 md:px-6 ${
            isSongStep
              ? "max-w-2xl py-6 md:flex md:min-h-[calc(100vh-60px)] md:flex-col md:justify-center md:py-8"
              : "max-w-4xl py-6 md:py-10"
          }`}
        >
          {step === "metadata" && <StepMetadata data={data} onChange={update} />}
          {step === "parties" && <StepParties data={data} onChange={update} />}
          {step === "rights" && <StepRights data={data} onChange={update} />}
          {step === "clauses" && <StepClauses data={data} onChange={update} />}
          {step === "signatures" && <StepSignatures data={data} onChange={update} />}
          {step === "review" && <StepReview data={data} />}

          {/* Navigation */}
          <div className="mt-8 md:mt-10 flex items-center justify-between border-t border-border pt-5 md:pt-6">
            <button
              onClick={stepIdx === 0 ? onBack : prev}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              ← {stepIdx === 0 ? "Cancel" : "Back"}
            </button>

            {step === "review" ? (
              <button
                onClick={handlePropose}
                className="bg-primary text-primary-foreground rounded-lg px-5 md:px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Propose SPLIT Sheet
              </button>
            ) : (
              <button
                disabled={!canContinue()}
                onClick={next}
                className="bg-primary text-primary-foreground rounded-lg px-5 md:px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function createInitialContract(userProfile: UserProfile): ContractData {
  return {
    ...DEFAULT_CONTRACT,
    parties: [
      profileToParty(userProfile),
      makeParty({ percent: 50, signingOrder: 2, inviteMethod: "email", role: "Contributor" }),
    ],
  };
}

function requiresPublishingDetails(status?: string) {
  return ["Signed to publisher", "Admin by third party", "Co-published"].includes(status ?? "");
}

function profileToParty(userProfile: UserProfile): Party {
  const phoneNumber = [userProfile.phoneCountryCode, userProfile.phoneNumber].filter(Boolean).join(" ").trim();
  const publishingStatus = userProfile.publishingStatus || "Unknown";
  const needsPublishingDetails = requiresPublishingDetails(publishingStatus);

  return makeParty({
    splitId: userProfile.splitId,
    phoneNumber,
    inviteMethod: "splitId",
    inviteValue: userProfile.splitId,
    accountLinked: true,
    isCurrentUser: true,
    legalName: userProfile.legalName || [userProfile.legalFirstName, userProfile.legalMiddleName, userProfile.legalLastName].filter(Boolean).join(" "),
    professionalName: userProfile.pkaNames.split(",")[0]?.trim() || "",
    email: userProfile.emailAddress,
    country: userProfile.country || "United States",
    proAffiliation: userProfile.proAffiliation || "Unknown",
    customProName: userProfile.customProName || "",
    ipiNumber: userProfile.ipiNumber || "",
    publishingStatus,
    publisherName: needsPublishingDetails ? userProfile.publisherName || userProfile.adminCompanyName || "" : "",
    publisherIpi: needsPublishingDetails ? userProfile.publisherIpi || userProfile.adminIpi || "" : "",
    publisherPro: needsPublishingDetails ? userProfile.publisherPro || userProfile.proAffiliation || "" : "",
    publisherContact: needsPublishingDetails ? userProfile.publisherContact || "" : "",
    percent: 50,
    role: "Songwriter",
    signingOrder: 1,
  });
}
