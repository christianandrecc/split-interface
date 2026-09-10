import React, { useState, useCallback } from "react";
import splitLockup from "@/assets/split-navy-amber-lockup.png";
import { ArrowLeft, ChevronRight, Lock, Sparkles } from "lucide-react";
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
import type { CollaboratorSuggestion } from "@/lib/collaboratorSuggestions";

export default function ContractBuilder({
  userProfile,
  onBack,
  onHome,
  onStoreDocument,
  onSendDocument,
  recentCollaborators = [],
}: {
  userProfile: UserProfile;
  onBack: () => void;
  onHome?: () => void;
  onStoreDocument: (document: StoredSplitSheetDocument) => Promise<SplitSheetSaveResult>;
  onSendDocument: (document: StoredSplitSheetDocument) => Promise<SplitSheetSaveResult>;
  recentCollaborators?: CollaboratorSuggestion[];
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
          : "The backend was unavailable, so this preview used local storage.",
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
      toast.success(result.persisted ? "SPLIT Sheet stored" : "SPLIT Sheet stored locally", {
        description: result.persisted ? "The backend record is ready." : "The backend was unavailable, so this preview used local storage.",
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
          ? "Messages review started"
          : "Solo SPLIT Sheet stored",
        {
          description: result.persisted
            ? "Collaborators can now review, chat, counter, and sign in Messages."
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
        <button
          type="button"
          aria-label="Go to Dashboard"
          onClick={onHome ?? onBack}
          className="hidden rounded-lg bg-[hsl(var(--sidebar-background))] px-2 py-1 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:inline-flex"
        >
          <img src={splitLockup} alt="SPLIT" className="h-5 w-auto object-contain" />
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Back</span>
        </button>
        <div className="h-5 w-px bg-border hidden md:block" />
        <span className="text-sm font-semibold">New SPLIT</span>
        <div className="ml-auto overflow-x-auto">
          <ProgressTracker current={step} onNavigate={setStep} />
        </div>
      </header>

      <CreationElephantAssistant currentStep={step} />

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
          {step === "parties" && (
            <StepParties
              data={data}
              onChange={update}
              recentCollaborators={recentCollaborators}
              currentProfile={userProfile}
            />
          )}
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

const elephantStepCopy: Record<StepId, { title: string; body: string; prompt: string }> = {
  metadata: {
    title: "Help me fill this",
    body: "Start with the work title, artist/project, and creation date. Optional details can stay tucked away until they matter.",
    prompt: "Guiding this SPLIT",
  },
  clauses: {
    title: "Check sample details",
    body: "If this work uses a sample, keep the source artist, title, and seconds used clear before anyone reviews terms.",
    prompt: "Watching clearance",
  },
  parties: {
    title: "Balance the split",
    body: "Add collaborators by username or email, then make sure the shares land at exactly 100% before sending.",
    prompt: "Reading the shares",
  },
  review: {
    title: "Final private read",
    body: "This is the last pass before Messages review starts. Check the collaborators, percentages, and sample answers once more.",
    prompt: "Reviewing before send",
  },
};

function CreationElephantAssistant({ currentStep }: { currentStep: StepId }) {
  const [open, setOpen] = useState(false);
  const copy = elephantStepCopy[currentStep];

  return (
    <div className="pointer-events-none fixed right-3 top-[70px] z-40 sm:right-5 md:right-6 lg:right-8">
      <div className="pointer-events-auto relative">
        <button
          type="button"
          aria-label="Open Elephant creation assistant"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`group flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-left shadow-[0_18px_44px_hsl(var(--split-pending)/0.14)] backdrop-blur-xl transition ${
            open
              ? "border-[hsl(var(--split-pending)/0.45)] bg-white/95"
              : "border-[hsl(var(--split-pending)/0.32)] bg-white/80 hover:border-[hsl(var(--split-pending)/0.48)] hover:bg-white/95"
          }`}
        >
          <span className="flex h-9 w-9 flex-shrink-0 overflow-hidden rounded-xl border border-[hsl(var(--split-pending)/0.28)] bg-[hsl(var(--sidebar-background))]">
            <img src={splitLockup} alt="" className="h-full w-full object-cover object-left" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold leading-none text-foreground">Elephant</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/85 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                Private
              </span>
            </span>
            <span className="mt-1 block text-xs leading-none text-muted-foreground">{copy.prompt}</span>
          </span>
          <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-3 w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[hsl(var(--split-pending)/0.25)] bg-white/92 p-4 text-left shadow-[0_24px_70px_hsl(var(--split-amended)/0.18)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 overflow-hidden rounded-xl border border-[hsl(var(--split-pending)/0.28)] bg-[hsl(var(--sidebar-background))]">
                <img src={splitLockup} alt="" className="h-full w-full object-cover object-left" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-foreground">Elephant</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--split-bone))] px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Only you can see this
                  </span>
                </div>
                <p className="mt-2 text-base font-bold text-foreground">{copy.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.body}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-[hsl(var(--split-pending)/0.2)] bg-[hsl(var(--split-bone)/0.72)] px-3 py-2 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Private assistant, no collaborator visibility
              </span>
            </div>
          </div>
        )}
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
