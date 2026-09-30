import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleX, Clock3, Loader2, MailWarning, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { canRetryInvitationDelivery, deliveryPresentation, loadInvitationDelivery, retryInvitationEmail, type InvitationDelivery } from "@/lib/invitationDelivery";
import { splitSheetParticipantDisplayName } from "@/lib/splitSheetDisplay";
import type { NegotiationDeal } from "@/lib/splitSheetNegotiation";

type Props = { deal: NegotiationDeal; userId?: string };

export default function ConversationInvitations(props: Props) {
  return <InvitationMembers key={`${props.userId ?? "member"}:${props.deal.id}`} {...props} />;
}

function InvitationMembers({ deal, userId }: Props) {
  const [rows, setRows] = useState<InvitationDelivery[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [reload, setReload] = useState(0);
  const invites = deal.document.collaboratorInvites;
  const pendingKey = invites.filter(invite => invite.status === "Pending").map(invite => invite.partyId).sort().join(",");

  useEffect(() => {
    if (!userId || !pendingKey) return;
    let cancelled = false;
    setState("loading");
    loadInvitationDelivery(userId, deal.id).then(result => {
      if (cancelled) return;
      setRows(result ?? []);
      setState(result === null ? "unavailable" : "ready");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [userId, deal.id, pendingKey, reload]);

  useEffect(() => {
    if (!userId || !pendingKey || state === "loading" || state === "unavailable") return;
    const refresh = () => { if (!document.hidden) setReload(value => value + 1); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [userId, pendingKey, state]);

  if (!invites.length) return null;
  return <ul aria-label="Invitation status" className="split-chat-members">
    {invites.map(invite => {
      const name = splitSheetParticipantDisplayName(deal.document, invite.id, invite.name);
      const membership = invite.status === "Accepted" ? "joined" : invite.status === "Declined" ? "declined" : "invited";
      const Icon = membership === "joined" ? CheckCircle2 : membership === "declined" ? CircleX : Clock3;
      const delivery = userId && membership === "invited" ? rows.find(row => row.partyId === invite.partyId) : undefined;
      return <li key={invite.id} data-state={membership}>
        <Icon size={13} aria-hidden="true" /><span>{name} <span className="split-chat-member-state">{membership === "invited" ? "invite pending" : membership}</span></span>
        {userId && delivery && deliveryPresentation(delivery).problem && <InvitationProblem
          key={delivery.id ?? invite.id} userId={userId} row={delivery} name={name} contact={invite.inviteValue}
          loading={state === "loading"} stale={state === "error"} onRefresh={() => setReload(value => value + 1)} />}
      </li>;
    })}
  </ul>;
}

function InvitationProblem({ userId, row, name, contact, loading, stale, onRefresh }: {
  userId: string; row: InvitationDelivery; name: string; contact: string; loading: boolean; stale: boolean; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const active = useRef(true);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const canRetry = canRetryInvitationDelivery(row) && !loading && !stale;
  const presentation = deliveryPresentation(row);

  const retry = async () => {
    if (!canRetry || !row.id || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      await retryInvitationEmail(userId, row.id);
      if (active.current) { setConfirm(false); toast.success("Invitation email retry queued."); onRefresh(); }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : "Retry unavailable. Contact SPLIT.");
    } finally { if (active.current) setBusy(false); inFlight.current = false; }
  };

  return <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button ref={trigger} type="button" className="split-invite-issue" aria-label={`Email issue for ${name}`}><MailWarning size={13} aria-hidden="true" />Email issue</button></PopoverTrigger>
      <PopoverContent align="start" className="split-invite-popover" aria-label={`Invitation for ${name}`}>
        <h3>{name}</h3><p className="split-invite-contact">{contact}</p>
        <p>{presentation.detail}</p>
        {stale && <p role="status">Status could not be refreshed. Check again before retrying.</p>}
        <div className="split-invite-actions">
          {canRetryInvitationDelivery(row) && <Button type="button" variant="outline" size="sm" disabled={!canRetry || busy} onClick={() => { setOpen(false); setError(""); setConfirm(true); }}><RotateCcw size={14} />Retry email</Button>}
          <a href="mailto:xtiancarrera@gmail.com?subject=SPLIT%20invitation%20help">Contact SPLIT</a>
          <Button type="button" variant="ghost" size="icon" aria-label="Refresh invitation status" title="Refresh invitation status" disabled={loading || busy} onClick={onRefresh}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></Button>
        </div>
      </PopoverContent>
    </Popover>
    <AlertDialog open={confirm} onOpenChange={next => { if (!busy) setConfirm(next); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
        <AlertDialogHeader><AlertDialogTitle>Retry this invitation email?</AlertDialogTitle><AlertDialogDescription>SPLIT will retry the failed email for {name}. This does not change the split or accept the invitation.</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={!canRetry || busy} onClick={event => { event.preventDefault(); void retry(); }}>{busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}Retry email</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
