import { useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { UserProfile } from "@/lib/userProfile";
import { canDeleteSplitSheetDraft } from "@/lib/splitSheetStorage";

export default function DeleteDraftButton({ document, profile, onDelete, disabled, onPendingChange }: {
  document: StoredSplitSheetDocument;
  profile: UserProfile;
  onDelete: (document: StoredSplitSheetDocument) => Promise<void>;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  if (!canDeleteSplitSheetDraft(document, profile)) return null;

  const remove = async () => {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setPending(true);
    onPendingChange?.(true);
    setError("");
    try {
      await onDelete(document);
      setOpen(false);
      toast.success("Draft deleted");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this draft. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
      onPendingChange?.(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!inFlight.current) { setOpen(next); setError(""); } }}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled || pending} className="gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive">
          <Trash2 className="h-4 w-4" aria-hidden="true" />Delete Draft
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            Are you sure you want to delete &quot;{document.title || "Untitled SPLIT"}&quot;? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel disabled={pending} className="mt-0">Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={() => void remove()} disabled={pending} aria-busy={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            {pending ? "Deleting..." : "Delete Draft"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
