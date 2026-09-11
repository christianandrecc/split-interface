import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { loadAccountEmail, requestAccountEmailChange, resendAccountEmailChange, type AccountEmail } from "@/lib/accountEmail";
import { supabase } from "@/integrations/supabase/client";

export default function AccountEmailControl({ userId }: { userId?: string }) {
  const [account, setAccount] = useState<AccountEmail | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestState = useRef({ running: false, revision: 0 });

  const run = useCallback(async (operation: "load" | "change" | "resend", value = "") => {
    const state = requestState.current;
    if (!userId || state.running) return;
    state.running = true;
    const request = ++state.revision;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = operation === "change" ? await requestAccountEmailChange(userId, value)
        : operation === "resend" ? await resendAccountEmailChange(userId) : await loadAccountEmail(userId);
      if (request !== state.revision) return;
      setAccount(result);
      if (operation === "change") { setOpen(false); setEmail(""); }
      if (operation === "resend" && result.pendingEmail) setNotice("Confirmation requested. Check your inboxes.");
      if (operation !== "load" && !result.pendingEmail) setNotice("Account email is up to date.");
    } catch (cause) {
      if (request !== state.revision) return;
      if (operation === "load") setAccount(null);
      setError(cause instanceof Error ? cause.message : "Could not check your email. Try again.");
    } finally {
      if (request === state.revision) { state.running = false; setBusy(false); }
    }
  }, [userId]);

  useEffect(() => {
    const state = requestState.current;
    void run("load");
    if (!userId) return;
    const refresh = () => { void run("load"); };
    let timer: ReturnType<typeof setTimeout>;
    const { data } = supabase.auth.onAuthStateChange(event => {
      // Keep Auth requests outside the SDK's auth-state callback lock.
      if (["USER_UPDATED", "SIGNED_IN", "SIGNED_OUT"].includes(event)) {
        clearTimeout(timer);
        timer = setTimeout(refresh, 0);
      }
    });
    window.addEventListener("focus", refresh);
    return () => {
      state.revision++;
      state.running = false;
      clearTimeout(timer);
      data.subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
    };
  }, [run, userId]);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="text-sm font-medium text-muted-foreground">Account email</p>
          <p className="break-all text-sm font-semibold">{account?.email || (busy ? "Checking account..." : "Not verified")}</p>
        </div>
        <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setError(""); setEmail(""); } }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!account || busy} className="shrink-0 gap-2">
              <Mail className="h-4 w-4" />Change email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg" showCloseButton={!busy}>
            <DialogHeader>
              <DialogTitle className="tracking-normal">Change account email</DialogTitle>
              <DialogDescription>Confirm the change using the links sent to your inboxes. Your current email stays active until confirmation is complete.</DialogDescription>
            </DialogHeader>
            <form className="min-w-0 space-y-4" onSubmit={event => { event.preventDefault(); void run("change", email); }}>
              <div className="min-w-0 text-sm text-muted-foreground">Current email<p className="break-all font-medium text-foreground">{account?.email}</p></div>
              <div className="space-y-2">
                <Label htmlFor="new-account-email">New email address</Label>
                <Input id="new-account-email" type="email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={event => setEmail(event.target.value)} />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={busy || !email.trim()} className="min-w-[11rem] gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {busy ? "Requesting..." : "Send confirmation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {account?.pendingEmail && <div role="status" className="space-y-1 text-sm">
        <p className="font-medium">Awaiting confirmation: <span className="break-all">{account.pendingEmail}</span></p>
        <p className="text-muted-foreground">Check both inboxes. Sign-in and password recovery still use your current email.</p>
      </div>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {error && !open && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!userId && <p className="text-sm text-muted-foreground">Sign in to manage your account email.</p>}
      {userId && <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={busy} className="gap-2" onClick={() => void run("load")}>
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />Check status
        </Button>
        {account?.pendingEmail && <Button type="button" size="sm" variant="ghost" disabled={busy} className="gap-2" onClick={() => void run("resend")}><Mail className="h-4 w-4" />Resend confirmation</Button>}
      </div>}
    </div>
  );
}
