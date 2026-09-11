import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import { downloadSplitSheetRecord } from "@/lib/splitSheetDownload";
import type { UserProfile } from "@/lib/userProfile";

export default function SplitSheetDownloadButton({ source, viewerProfile, isFinalRecord }: {
  source?: StoredSplitSheetDocument;
  viewerProfile: UserProfile;
  isFinalRecord: boolean;
}) {
  const [state, setState] = useState<"idle" | "pending" | "ready">("idle");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (state !== "ready") return;
    const timer = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [state]);

  const exportPdf = async () => {
    if (!source || inFlight.current) return;
    inFlight.current = true;
    setState("pending");
    try {
      await downloadSplitSheetRecord(source, viewerProfile);
      if (!mounted.current) return;
      setState("ready");
      // The browser controls saving the file; only confirm generation and handoff.
      toast.success("PDF ready", { description: "The download was requested." });
    } catch (error) {
      if (!mounted.current) return;
      setState("idle");
      toast.error(error instanceof Error ? error.message : "The PDF could not be exported. Please try again.");
    } finally {
      inFlight.current = false;
    }
  };

  return <>
    <button type="button" onClick={exportPdf} disabled={!source || state === "pending"}
      aria-busy={state === "pending"} data-export-state={state}
      title={state === "pending" ? "Preparing PDF" : state === "ready" ? "PDF ready. Download requested." : undefined}
      className="split-press inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--split-allocation-1))] bg-background px-4 py-2.5 text-xs font-bold text-[hsl(var(--split-allocation-1))] shadow-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
      <span className={`inline-flex h-3.5 w-3.5 shrink-0 ${state === "ready" ? "split-confirmation" : ""}`} aria-hidden="true">
        {state === "pending" ? <Loader2 className="h-full w-full animate-spin" /> : state === "ready" ? <CheckCircle2 className="h-full w-full" /> : <Download className="h-full w-full" />}
      </span>
      {isFinalRecord ? "Download SPLIT" : "Download draft"}
    </button>
    <span className="sr-only" role="status">{state === "pending" ? "Preparing PDF..." : state === "ready" ? "PDF ready. Download requested." : ""}</span>
  </>;
}
