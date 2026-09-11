import React, { useState, useCallback, useRef, useEffect } from "react";
import splitLockup from "@/assets/split-light-lockup.png";
import elephantMascot from "@/assets/split-elephant-mascot.png";
import { ArrowLeft, ArrowRight, Loader2, Lock, Save, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useContentEntrance } from "@/hooks/use-content-entrance";
import ProgressTracker from "./ProgressTracker";
import StepMetadata from "./StepMetadata";
import StepParties from "./StepParties";
import StepClauses from "./StepClauses";
import StepReview from "./StepReview";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import DeleteDraftButton from "@/components/DeleteDraftButton";

export default function ContractBuilder({
  userProfile,
  onBack,
  onHome,
  onStoreDocument,
  onSendDocument,
  onComplete,
  onDeleteDocument,
  initialDocument,
  recentCollaborators = [],
}: {
  userProfile: UserProfile;
  onBack: () => void;
  onHome?: () => void;
  onStoreDocument: (document: StoredSplitSheetDocument) => Promise<SplitSheetSaveResult>;
  onSendDocument: (document: StoredSplitSheetDocument) => Promise<SplitSheetSaveResult>;
  onComplete?: (document: StoredSplitSheetDocument, mode: "draft" | "send") => void;
  onDeleteDocument?: (document: StoredSplitSheetDocument) => Promise<void>;
  initialDocument?: StoredSplitSheetDocument;
  recentCollaborators?: CollaboratorSuggestion[];
}) {
  const [step, setStep] = useState<StepId>(initialDocument ? "review" : "metadata");
  const [furthestStep, setFurthestStep] = useState(initialDocument ? STEPS.length - 1 : 0);
  const [data, setData] = useState<ContractData>(() => initialDocument?.data ?? createInitialContract(userProfile));
  const documentRef = useRef<StoredSplitSheetDocument | null>(initialDocument ?? null);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState<"draft" | "send" | null>(null);
  const [completed, setCompleted] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const savingDocument = saving !== null || deleting;
  const canFinish = Boolean(data.songTitle.trim() && data.sampleStatus && data.parties.length
    && data.parties.every(isWriterReady) && Math.abs(sumPercents(data.parties) - 100) < 0.01);

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const contentRef = useContentEntrance<HTMLDivElement>(step);
  const previousStep = useRef(step);
  const stepStartRef = useRef<HTMLDivElement>(null);
  const signedInArtistName = getSignedInArtistName(userProfile);

  const update = useCallback(
    (partial: Partial<ContractData>) => setData((prev) => ({ ...prev, ...partial })),
    []
  );

  const isStepReady = (target: StepId): boolean => {
    const writersReady = data.parties.every(isWriterReady);
    switch (target) {
      case "metadata": return !!data.songTitle.trim();
      case "clauses": return !!data.sampleStatus;
      case "parties": return data.parties.length >= 1 && writersReady && Math.abs(sumPercents(data.parties) - 100) < 0.01;
      case "review": return canFinish;
      default: return false;
    }
  };

  const canNavigate = (target: StepId) => {
    const targetIdx = STEPS.findIndex((item) => item.id === target);
    return !savingDocument && !completed && targetIdx <= furthestStep
      && (targetIdx <= stepIdx || STEPS.slice(0, targetIdx).every((item) => isStepReady(item.id)));
  };
  const navigate = (target: StepId) => {
    if (!inFlight.current && canNavigate(target)) setStep(target);
  };
  const next = () => {
    if (stepIdx < STEPS.length - 1 && isStepReady(step) && !inFlight.current && !deleting && !completed) {
      setFurthestStep((current) => Math.max(current, stepIdx + 1));
      setStep(STEPS[stepIdx + 1].id);
    }
  };
  const prev = () => { if (stepIdx > 0) navigate(STEPS[stepIdx - 1].id); };

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    stepStartRef.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
    contentRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [step, contentRef]);

  const finishDocument = async (mode: "draft" | "send") => {
    if (inFlight.current || completed || deleting) return;
    if (!canFinish) {
      setSaveError("Review the work details, collaborator addresses, and shares. Ownership must total 100%.");
      return;
    }
    if (initialDocument && (initialDocument.status !== "Draft" || initialDocument.sentAt)) {
      setSaveError("This split has already been sent. Open Messages to review it.");
      return;
    }

    inFlight.current = true;
    setSaving(mode);
    setSaveError("");
    try {
      const signedInArtistData = bindContractToSignedInArtist(data, userProfile);
      const fresh = createSplitSheetDocument(signedInArtistData, userProfile);
      // Keep the same record ID through retries and edits, including ambiguous network failures.
      const identity = documentRef.current ?? fresh;
      const draft: StoredSplitSheetDocument = {
        ...fresh,
        id: identity.id,
        documentNumber: identity.documentNumber,
        createdAt: identity.createdAt,
        serverRevision: identity.serverRevision,
        storedAt: identity.storedAt,
        auditTrail: identity.auditTrail,
      };
      documentRef.current = draft;
      const actor = userProfile.legalName || userProfile.emailAddress || "SPLIT user";
      const request = mode === "send"
        ? queueContractDelivery({
            ...draft,
            status: draft.collaborators.length ? "Pending Collaborator Acceptance" : "Ready to Sign",
          }, actor)
        : addDocumentAuditTrail(draft, actor, "Stored draft in account");
      const result = await (mode === "send" ? onSendDocument(request) : onStoreDocument(request));
      if (mode === "send" && (!result.persisted || !result.document.sentAt || result.document.status === "Draft")) {
        throw new Error("Invitations were not confirmed by the server. Your details are still here; please try again.");
      }
      documentRef.current = result.document;
      setCompleted(true);
      setConfirmSend(false);
      if (mode === "send") {
        toast.success(draft.collaborators.length ? "Split invitations sent" : "Split sheet ready to sign");
      } else {
        toast.success(result.persisted ? "Saved to Drafts" : "Draft saved on this device", {
          description: result.persisted ? undefined : "Supabase has not confirmed this draft yet.",
        });
      }
      if (onComplete) onComplete(result.document, mode);
      else onBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again. Your details are still here.";
      setSaveError(message);
      toast.error(mode === "send" ? "Could not send split invitations" : "Could not save this draft", { description: message });
    } finally {
      inFlight.current = false;
      setSaving(null);
    }
  };

  return (
    <div ref={stepStartRef} className="min-h-screen bg-background flex flex-col safe-top safe-bottom">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto grid h-16 max-w-4xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              disabled={savingDocument}
              title="Back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Go to Dashboard"
              disabled={savingDocument}
              onClick={onHome ?? onBack}
              className="hidden h-11 shrink-0 items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:inline-flex"
            >
              <img src={splitLockup} alt="SPLIT" className="h-8 w-auto object-contain" />
            </button>
          </div>
          <span className="text-center text-sm font-semibold">{initialDocument ? "Edit Draft" : "New SPLIT"}</span>
          <div className="justify-self-end">
            <CreationElephantAssistant currentStep={step} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-4xl px-4 pb-6 md:px-6">
        <div className="mb-7 pt-3">
          <ProgressTracker current={step} onNavigate={navigate} canNavigate={canNavigate}
            completed={(target) => STEPS.findIndex((item) => item.id === target) < furthestStep && isStepReady(target)} />
        </div>
          {initialDocument && onDeleteDocument && (
            <div className="mb-4 flex justify-end">
              <DeleteDraftButton document={initialDocument} profile={userProfile} onDelete={onDeleteDocument}
                disabled={saving !== null || completed} onPendingChange={setDeleting} />
            </div>
          )}
          <fieldset disabled={savingDocument || completed} className="min-w-0">
            <div ref={contentRef}>
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
            {step === "review" && <StepReview data={data} onEdit={navigate} />}
            </div>

            {/* Navigation */}
            {saveError && !confirmSend && <p role="alert" className="mt-4 text-sm text-destructive">{saveError}</p>}
            <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background py-4">
              <button
                onClick={stepIdx === 0 ? onBack : prev}
                className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" />{stepIdx === 0 ? "Cancel" : "Back"}
              </button>

              {step === "review" ? (
                <div className="grid w-full grid-cols-2 gap-2 min-[480px]:w-auto">
                  <Button variant="outline" onClick={() => void finishDocument("draft")} disabled={savingDocument || !canFinish} aria-busy={saving === "draft"} className="h-auto min-h-11 whitespace-normal px-3 py-2 text-xs sm:text-sm">
                    {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving === "draft" ? "Saving..." : "Save To Drafts"}
                  </Button>
                  <AlertDialog open={confirmSend} onOpenChange={(open) => { if (!inFlight.current) { setConfirmSend(open); setSaveError(""); } }}>
                    <AlertDialogTrigger asChild>
                      <Button disabled={savingDocument || !canFinish} className="h-auto min-h-11 whitespace-normal px-3 py-2 text-xs sm:text-sm"><Send className="h-4 w-4" />Send Split Invite</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ready to send?</AlertDialogTitle>
                        <AlertDialogDescription>Make sure all details, split percentages, and collaborator usernames are correct before sending.</AlertDialogDescription>
                      </AlertDialogHeader>
                      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
                      <AlertDialogFooter className="gap-2 sm:space-x-0">
                        <AlertDialogCancel disabled={savingDocument} className="mt-0">Review Details</AlertDialogCancel>
                        <Button onClick={() => void finishDocument("send")} disabled={savingDocument || completed || !canFinish} aria-busy={saving === "send"}>
                          {saving === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {saving === "send" ? "Sending..." : "Send Split Invite"}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <button
                  disabled={!isStepReady(step)}
                  onClick={next}
                  className="split-press inline-flex min-h-11 items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </fieldset>
      </main>
    </div>
  );
}

const elephantStepCopy: Record<StepId, { title: string; body: string }> = {
  metadata: {
    title: "Help me fill this",
    body: "Start with the work title, artist/project, and creation date. Optional details can stay tucked away until they matter.",
  },
  clauses: {
    title: "Check sample details",
    body: "If this work uses a sample, keep the source artist, title, and seconds used clear before anyone reviews terms.",
  },
  parties: {
    title: "Balance the split",
    body: "Add collaborators by username or email, then make sure the shares land at exactly 100% before sending.",
  },
  review: {
    title: "Final private read",
    body: "This is the last pass before Messages review starts. Check the collaborators, percentages, and sample answers once more.",
  },
};

function CreationElephantAssistant({ currentStep }: { currentStep: StepId }) {
  const copy = elephantStepCopy[currentStep];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Open Elephant creation assistant"
          title="Open Elephant creation assistant"
          className="flex h-11 w-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:px-2">
          <span className="h-7 w-7 shrink-0 overflow-hidden">
            <img src={elephantMascot} alt="" className="h-full w-full object-contain" />
          </span>
          <span className="hidden sm:inline">Elephant</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] rounded-lg">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />Only you can see this
        </div>
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.body}</p>
      </PopoverContent>
    </Popover>
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
