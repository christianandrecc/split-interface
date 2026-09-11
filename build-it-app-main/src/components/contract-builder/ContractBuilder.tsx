import React, { useState, useCallback, useRef } from "react";
import splitLockup from "@/assets/split-navy-amber-lockup.png";
import { ArrowLeft, ChevronRight, Loader2, Lock, Save, Send, Sparkles } from "lucide-react";
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
      case "review": return canFinish;
      default: return false;
    }
  };

  const next = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].id); };
  const prev = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].id); };

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
    <div className="min-h-screen bg-background flex flex-col safe-top safe-bottom">
      {/* Header */}
      <header className="h-[56px] md:h-[60px] border-b border-border flex items-center px-4 md:px-6 gap-3 md:gap-4 flex-shrink-0 bg-background">
        <button
          type="button"
          aria-label="Go to Dashboard"
          disabled={savingDocument}
          onClick={onHome ?? onBack}
          className="hidden rounded-lg bg-[hsl(var(--sidebar-background))] px-2 py-1 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:inline-flex"
        >
          <img src={splitLockup} alt="SPLIT" className="h-5 w-auto object-contain" />
        </button>
        <button
          onClick={onBack}
          disabled={savingDocument}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Back</span>
        </button>
        <div className="h-5 w-px bg-border hidden md:block" />
        <span className="text-sm font-semibold">{initialDocument ? "Edit Draft" : "New SPLIT"}</span>
        <div className="ml-auto overflow-x-auto">
          <ProgressTracker current={step} onNavigate={(nextStep) => { if (!inFlight.current && !deleting) setStep(nextStep); }} />
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
          {initialDocument && onDeleteDocument && (
            <div className="mb-4 flex justify-end">
              <DeleteDraftButton document={initialDocument} profile={userProfile} onDelete={onDeleteDocument}
                disabled={saving !== null || completed} onPendingChange={setDeleting} />
            </div>
          )}
          <fieldset disabled={savingDocument || completed} className="min-w-0">
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
            {saveError && !confirmSend && <p role="alert" className="mt-4 text-sm text-destructive">{saveError}</p>}
            <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5 md:pt-6">
              <button
                onClick={stepIdx === 0 ? onBack : prev}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                ← {stepIdx === 0 ? "Cancel" : "Back"}
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
                  disabled={!canContinue()}
                  onClick={next}
                  className="split-press bg-primary text-primary-foreground rounded-lg px-5 md:px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Continue →
                </button>
              )}
            </div>
          </fieldset>
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
