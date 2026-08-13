import React, { useState, useCallback } from "react";
import splitLogo from "@/assets/split-logo.png";
import { ArrowLeft } from "lucide-react";
import ProgressTracker from "./ProgressTracker";
import StepMetadata from "./StepMetadata";
import StepParties from "./StepParties";
import StepClauses from "./StepClauses";
import StepReview from "./StepReview";
import SplitSheetDocumentPreview from "./SplitSheetDocumentPreview";
import { createSplitSheetDocument, addDocumentAuditTrail, type StoredSplitSheetDocument } from "./document";
import type { UserProfile } from "@/lib/userProfile";
import { queueContractDelivery } from "@/lib/splitSheetWorkflow";
import {
  STEPS,
  type StepId,
  type ContractData,
  type Party,
  DEFAULT_CONTRACT,
  getTodayDateInputValue,
  makeParty,
  sumPercents,
  isWriterReady,
} from "./types";
import { toast } from "sonner";
import type { SplitSheetSaveResult } from "@/lib/splitSheetStorage";

export default function ContractBuilder({
  userProfile,
  onBack,
  onStoreDocument,
  onSendDocument,
}: {
  userProfile: UserProfile;
  onBack: () => void;
  onStoreDocument: (document: StoredSplitSheetDocument) => Promise<SplitSheetSaveResult>;
  onSendDocument: (document: StoredSplitSheetDocument) => Promise<SplitSheetSaveResult>;
}) {
  const [step, setStep] = useState<StepId>("metadata");
  const [data, setData] = useState<ContractData>(() => createInitialContract(userProfile));
  const [generatedDocument, setGeneratedDocument] = useState<StoredSplitSheetDocument | null>(null);
  const [documentStored, setDocumentStored] = useState(false);
  const [documentSent, setDocumentSent] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const isSongStep = step === "metadata";
  const signedInArtistName = getSignedInArtistName(userProfile);

  const update = useCallback(
    (partial: Partial<ContractData>) => setData((prev) => ({ ...prev, ...partial })),
    []
  );

  const canContinue = (): boolean => {
    const writersReady = data.parties.every(isWriterReady);
    switch (step) {
      case "metadata": return !!data.songTitle.trim();
      case "clauses": return !!data.sampleStatus;
      case "parties": return data.parties.length >= 1 && writersReady && Math.abs(sumPercents(data.parties) - 100) < 0.01;
      case "review": return true;
      default: return false;
    }
  };

  const next = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].id); };
  const prev = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].id); };

  const handlePropose = async () => {
    if (savingDocument) return;

    const signedInArtistData = bindContractToSignedInArtist(data, userProfile);
    const document = createSplitSheetDocument(signedInArtistData, userProfile);
    const actor = userProfile.emailAddress || userProfile.legalName || "SPLIT user";
    const storedDocument = addDocumentAuditTrail(
      {
        ...document,
        status: "Draft",
        storedAt: document.storedAt || new Date().toISOString(),
      },
      actor,
      "Stored draft in account",
    );

    setData(signedInArtistData);
    setGeneratedDocument(storedDocument);
    setDocumentStored(false);
    setDocumentSent(false);
    setSavingDocument(true);

    try {
      const result = await onStoreDocument(storedDocument);
      setGeneratedDocument(result.document);
      setDocumentStored(true);
      toast.success(result.persisted ? "SPLIT Sheet draft saved" : "SPLIT Sheet draft saved locally", {
        description: result.persisted
          ? "The draft is now visible in your account."
          : "Supabase was unavailable, so this preview used local storage.",
      });
    } catch (error) {
      toast.error("Could not save this SPLIT Sheet draft", {
        description: error instanceof Error ? error.message : "Check the split percentages and try again.",
      });
    } finally {
      setSavingDocument(false);
    }
  };

  const handleStoreGeneratedDocument = async () => {
    if (!generatedDocument || savingDocument) return;

    const storedDocument = addDocumentAuditTrail(
      {
        ...generatedDocument,
        status: "Draft",
        storedAt: generatedDocument.storedAt || new Date().toISOString(),
      },
      userProfile.emailAddress || userProfile.legalName || "SPLIT user",
      "Stored in account",
    );

    setSavingDocument(true);
    try {
      const result = await onStoreDocument(storedDocument);
      setGeneratedDocument(result.document);
      setDocumentStored(true);
      toast.success(result.persisted ? "SPLIT Sheet stored in Supabase" : "SPLIT Sheet stored locally", {
        description: result.persisted ? "The backend record is ready." : "Supabase was unavailable, so this preview used local storage.",
      });
    } catch (error) {
      toast.error("Could not store this SPLIT Sheet", {
        description: error instanceof Error ? error.message : "Check the split percentages and try again.",
      });
    } finally {
      setSavingDocument(false);
    }
  };

  const handleSendGeneratedDocument = async () => {
    if (!generatedDocument || savingDocument) return;

    const actor = userProfile.emailAddress || userProfile.legalName || "SPLIT user";
    const sentDocument = queueContractDelivery(addDocumentAuditTrail(
      {
        ...generatedDocument,
        status: generatedDocument.collaborators.length ? "Pending Collaborator Acceptance" : "Verified and Stored",
        storedAt: generatedDocument.storedAt || new Date().toISOString(),
        sentAt: new Date().toISOString(),
      },
      actor,
      generatedDocument.collaborators.length ? "Sent invitations to collaborators" : "Stored solo writer split",
    ), actor);

    setSavingDocument(true);
    try {
      const result = await onSendDocument(sentDocument);
      setGeneratedDocument(result.document);
      setDocumentStored(true);
      setDocumentSent(true);
      toast.success(
        generatedDocument.collaborators.length
          ? "Contract delivery queued"
          : "Solo SPLIT Sheet stored",
        {
          description: result.persisted
            ? "Supabase has the split sheet and delivery request."
            : "Saved locally with a server-side delivery placeholder.",
        },
      );
    } catch (error) {
      toast.error("Could not send this SPLIT Sheet", {
        description: error instanceof Error ? error.message : "Check the split percentages and try again.",
      });
    } finally {
      setSavingDocument(false);
    }
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
          {step === "metadata" && <StepMetadata data={data} signedInArtistName={signedInArtistName} onChange={update} />}
          {step === "clauses" && <StepClauses data={data} onChange={update} />}
          {step === "parties" && <StepParties data={data} onChange={update} />}
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
                disabled={savingDocument}
                className="bg-primary text-primary-foreground rounded-lg px-5 md:px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
              >
                {savingDocument ? "Saving draft..." : "Create SPLIT Sheet"}
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
    creationDate: getTodayDateInputValue(),
    artistProjectName: getSignedInArtistName(userProfile),
    recordingArtist: getSignedInArtistName(userProfile),
    parties: [
      profileToParty(userProfile),
    ],
  };
}

function getSignedInArtistName(userProfile: UserProfile) {
  const legalName = safeText(userProfile.legalName);
  const pkaName = firstPkaName(userProfile);
  const displayName = safeText(userProfile.displayName);
  const emailAddress = safeText(userProfile.emailAddress);
  const fullLegalName = [
    userProfile.legalFirstName,
    userProfile.legalMiddleName,
    userProfile.legalLastName,
  ].map(safeText).filter(Boolean).join(" ");

  return (
    displayName ||
    pkaName ||
    legalName ||
    fullLegalName ||
    emailAddress ||
    "Signed-in SPLIT profile"
  );
}

function bindContractToSignedInArtist(data: ContractData, userProfile: UserProfile): ContractData {
  const signedInArtistName = getSignedInArtistName(userProfile);

  return {
    ...data,
    artistProjectName: signedInArtistName,
    recordingArtist: signedInArtistName,
  };
}

function requiresPublishingDetails(status?: string) {
  return ["Signed to publisher", "Admin by third party", "Co-published"].includes(status ?? "");
}

function profileToParty(userProfile: UserProfile): Party {
  const phoneNumber = [userProfile.phoneCountryCode, userProfile.phoneNumber].map(safeText).filter(Boolean).join(" ").trim();
  const publishingStatus = userProfile.publishingStatus || "Unknown";
  const needsPublishingDetails = requiresPublishingDetails(publishingStatus);
  const username = safeText(userProfile.username);
  const emailAddress = safeText(userProfile.emailAddress);
  const legalName = safeText(userProfile.legalName) || [
    userProfile.legalFirstName,
    userProfile.legalMiddleName,
    userProfile.legalLastName,
  ].map(safeText).filter(Boolean).join(" ");

  return makeParty({
    splitId: safeText(userProfile.splitId),
    phoneNumber,
    inviteMethod: username ? "username" : emailAddress ? "email" : "phone",
    inviteValue: username ? `@${username}` : emailAddress || phoneNumber,
    accountLinked: true,
    isCurrentUser: true,
    legalName,
    professionalName: firstPkaName(userProfile),
    email: emailAddress,
    country: safeText(userProfile.country) || "United States",
    proAffiliation: safeText(userProfile.proAffiliation) || "Unknown",
    customProName: safeText(userProfile.customProName),
    ipiNumber: safeText(userProfile.ipiNumber),
    publishingStatus,
    publisherName: needsPublishingDetails ? safeText(userProfile.publisherName) || safeText(userProfile.adminCompanyName) : "",
    publisherIpi: needsPublishingDetails ? safeText(userProfile.publisherIpi) || safeText(userProfile.adminIpi) : "",
    publisherPro: needsPublishingDetails ? safeText(userProfile.publisherPro) || safeText(userProfile.proAffiliation) : "",
    publisherContact: needsPublishingDetails ? safeText(userProfile.publisherContact) : "",
    percent: 100,
    role: "Songwriter",
    signingOrder: 1,
  });
}

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstPkaName(userProfile: UserProfile) {
  return safeText(userProfile.pkaNames).split(",")[0]?.trim() || "";
}
