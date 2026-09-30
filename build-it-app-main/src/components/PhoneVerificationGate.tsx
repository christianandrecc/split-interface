import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Loader2, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { loadAccountPhone, requestPhoneVerification, confirmPhoneVerification, type AccountPhone } from "@/lib/accountPhone";
import type { UserProfile } from "@/lib/userProfile";
import splitLockup from "@/assets/split-navy-amber-lockup.png";

export default function PhoneVerificationGate({ profile, onSignOut, children }: { profile: UserProfile; onSignOut: () => Promise<void>; children: ReactNode }) {
  // Keep paused SMS rollout independent of the not-yet-deployed phone status RPC.
  if (import.meta.env.VITE_PHONE_VERIFICATION_ENABLED !== "true") return children;
  if (!isSupabaseConfigured || !profile.authUserId) return children;
  return <PhoneCheck key={profile.authUserId} profile={profile} onSignOut={onSignOut}>{children}</PhoneCheck>;
}

function PhoneCheck({ profile, onSignOut, children }: { profile: UserProfile; onSignOut: () => Promise<void>; children: ReactNode }) {
  const [status, setStatus] = useState<AccountPhone | null>(null);
  const [phone, setPhone] = useState(`${profile.phoneCountryCode.split(" ")[0]}${profile.phoneNumber.replace(/\D/g, "")}`);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  const active = useRef(true);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    setError("");
    loadAccountPhone(profile.authUserId!).then(result => {
      if (cancelled) return;
      setStatus(result);
      if (result.pendingPhone) {
        const pendingPhone = `+${result.pendingPhone.replace(/\D/g, "")}`;
        setPhone(pendingPhone);
        setSentTo(pendingPhone);
      }
    }).catch(() => { if (!cancelled) setError("Could not check phone verification. Please retry."); });
    return () => { cancelled = true; };
  }, [profile.authUserId, reload]);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    if (!retryAt) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  if (status && (!status.required || status.verified)) return children;

  const act = async (verify: boolean) => {
    if (pending.current || (!verify && retryAt > Date.now())) return;
    pending.current = true; setBusy(true); setError("");
    try {
      if (verify) {
        const result = await confirmPhoneVerification(profile.authUserId!, sentTo, code);
        if (active.current) { setStatus(result); setCode(""); }
      } else {
        const destination = await requestPhoneVerification(profile.authUserId!, phone);
        if (active.current) { setSentTo(destination); setCode(""); window.setTimeout(() => codeInput.current?.focus(), 0); }
      }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      if (active.current) { if (!verify) setRetryAt(Date.now() + 60_000); setBusy(false); }
      pending.current = false;
    }
  };

  return <main className="min-h-screen bg-background px-5 py-10 text-foreground">
    <div className="mx-auto max-w-md">
      <img src={splitLockup} alt="SPLIT" className="mb-10 h-10 w-auto" />
      <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h1 className="text-xl font-bold">Verify your phone</h1></div>
      <p className="mb-6 text-sm text-muted-foreground">Your number stays private. Invitations and password recovery use email.</p>
      {!status && !error && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Checking your account</p>}
      {status && <form onSubmit={event => { event.preventDefault(); void act(Boolean(sentTo)); }} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="verification-phone">Phone number</Label><Input id="verification-phone" type="tel" autoComplete="tel" placeholder="+1 202 555 0100" value={phone} disabled={busy || Boolean(sentTo)} onChange={event => setPhone(event.target.value)} required /></div>
        {sentTo && <div className="space-y-2"><Label htmlFor="verification-code">Text message code</Label><Input ref={codeInput} id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} disabled={busy} required /><p role="status" className="text-xs text-muted-foreground">Code requested for {sentTo}.</p></div>}
        <Button type="submit" className="w-full" disabled={busy || (!sentTo && remaining > 0)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{sentTo ? "Verify and continue" : remaining ? `Try again in ${remaining}s` : "Send verification text"}</Button>
        {sentTo && <div className="flex flex-wrap justify-between gap-3"><Button type="button" variant="ghost" disabled={busy || remaining > 0} onClick={() => void act(false)}><RotateCcw className="h-4 w-4" />{remaining ? `Resend in ${remaining}s` : "Resend code"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { setSentTo(""); setCode(""); setError(""); }}>Change number</Button></div>}
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3 border-t pt-4"><Button type="button" variant="outline" disabled={busy} onClick={() => setReload(value => value + 1)}><RotateCcw className="h-4 w-4" />Check status</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => void onSignOut()}><LogOut className="h-4 w-4" />Sign out</Button></div>
      <a className="mt-4 block text-sm text-muted-foreground underline" href="mailto:xtiancarrera@gmail.com?subject=SPLIT%20phone%20verification">Contact SPLIT</a>
    </div>
  </main>;
}
