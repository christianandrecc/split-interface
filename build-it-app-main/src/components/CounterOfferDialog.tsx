import { useId, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Equal, Loader2, MessageSquarePlus, Minus, Plus, RotateCcw, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { counterAllocationState, counterShareUnits, equalCounterShares } from "@/lib/counterOffer";
import { workspaceInitials } from "@/lib/workspaceOverview";
import type { SplitVersion } from "@/lib/splitSheetNegotiation";
import "./counter-offer.css";

type Props = {
  title: string;
  version: SplitVersion;
  values: Record<string, string>;
  note: string;
  sending: boolean;
  error: string;
  stale: boolean;
  finalized: boolean;
  onValuesChange: (values: Record<string, string>) => void;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onReload: () => void;
  onSubmit: () => void;
};

export default function CounterOfferDialog(props: Props) {
  const { version, values, sending, note, stale, finalized } = props;
  const [noteOpen, setNoteOpen] = useState(Boolean(note));
  const firstInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const id = useId();
  const allocation = counterAllocationState(version.allocations, values);
  const changed = allocation.changed || Boolean(note.trim());
  const blocked = sending || stale || finalized;
  const status = allocation.invalidIds.length ? "Check shares" : allocation.valid ? "100% allocated"
    : allocation.remaining > 0 ? `${allocation.remaining}% remaining` : `${Math.abs(allocation.remaining)}% over`;
  const updateShare = (participantId: string, value: string) => props.onValuesChange({ ...values, [participantId]: value });
  const stepShare = (participantId: string, direction: number) => {
    const units = counterShareUnits(values[participantId] ?? "") ?? 0;
    updateShare(participantId, String(Math.max(0, Math.min(10000, units + direction * 100)) / 100));
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !sending) props.onClose(); }}>
    <DialogContent showCloseButton={false} overlayClassName="bg-foreground/25" className="counter-offer-dialog gap-0 p-0"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        firstInput.current?.focus(); firstInput.current?.select();
      }}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); }}
      onInteractOutside={(event) => event.preventDefault()}
      onEscapeKeyDown={(event) => { if (sending) event.preventDefault(); }}>
      <form className="counter-offer-form" noValidate onSubmit={(event) => { event.preventDefault(); if (!blocked && allocation.valid && changed) props.onSubmit(); }}>
        <header className="counter-offer-header">
          <div><DialogTitle>Counter offer</DialogTitle><DialogDescription>{props.title} <span className="counter-version">v{version.version}</span></DialogDescription></div>
          <button type="button" className="counter-icon-button split-press" aria-label="Close counter offer" title="Close counter offer" disabled={sending} onClick={props.onClose}><X size={18} /></button>
        </header>

        <div className="counter-offer-body">
          <div className="counter-allocation-summary">
            <div><span>Proposed split</span><span role="status" aria-live="polite" className={`counter-total ${allocation.valid ? "valid" : "incomplete"}`}>
              {allocation.valid ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}{status}
            </span></div>
            <div className="counter-allocation-bar" aria-label={`Total allocation ${allocation.total}%`}>
              {version.allocations.map((item, index) => <span key={item.participantId} className={`split-allocation-${index % 5 + 1}`}
                style={{ width: `${(counterShareUnits(values[item.participantId] ?? "") ?? 0) / 100 / Math.max(100, allocation.total) * 100}%` }} />)}
            </div>
          </div>

          <div className="counter-allocation-tools">
            <span>Shares</span>
            <div><button type="button" className="counter-equal-button split-press" disabled={blocked} onClick={() => props.onValuesChange(equalCounterShares(version.allocations))}><Equal size={16} />Split equally</button>
              <button type="button" className="counter-icon-button split-press" aria-label="Reset shares" title="Reset shares to the current proposal" disabled={blocked || !allocation.changed}
                onClick={() => props.onValuesChange(Object.fromEntries(version.allocations.map((item) => [item.participantId, String(item.percent)])))}><RotateCcw size={16} /></button></div>
          </div>

          <div className="counter-column-heads" aria-hidden="true"><span>Collaborator</span><span>Current</span><span>Proposed</span></div>
          <div className="counter-participants">
            {version.allocations.map((item, index) => {
              const value = values[item.participantId] ?? "";
              const units = counterShareUnits(value);
              const invalid = units === null;
              const inputId = `${id}-share-${index}`;
              return <div className="counter-participant" key={item.participantId}>
                <div className="counter-person">
                  <span className={`counter-avatar split-allocation-${index % 5 + 1}`} aria-hidden="true">{workspaceInitials(item.name)}</span>
                  <div><label htmlFor={inputId}>{item.name}</label><span className="counter-role">{item.role}</span><span className="counter-current-mobile">Currently {item.percent}%</span></div>
                </div>
                <span className="counter-current">{item.percent}%</span>
                <div className="counter-share-control" data-invalid={invalid} data-changed={units !== Math.round(item.percent * 100)}>
                  <button type="button" aria-label={`Decrease ${item.name}'s share`} title={`Decrease ${item.name}'s share by 1%`} disabled={blocked || units === 0} onClick={() => stepShare(item.participantId, -1)}><Minus size={14} /></button>
                  <span><input ref={index === 0 ? firstInput : undefined} id={inputId} type="number" inputMode="decimal" min="0" max="100" step="0.01"
                    style={{ width: `${Math.min(6, Math.max(2, value.length))}ch` }}
                    aria-label={`${item.name}'s proposed share`} aria-invalid={invalid} aria-describedby={invalid ? `${id}-share-error` : undefined}
                    disabled={blocked} value={value} onChange={(event) => updateShare(item.participantId, event.target.value)} onFocus={(event) => event.target.select()} /><span aria-hidden="true">%</span></span>
                  <button type="button" aria-label={`Increase ${item.name}'s share`} title={`Increase ${item.name}'s share by 1%`} disabled={blocked || units === 10000} onClick={() => stepShare(item.participantId, 1)}><Plus size={14} /></button>
                </div>
              </div>;
            })}
          </div>
          {allocation.invalidIds.length > 0 && <p id={`${id}-share-error`} className="counter-field-error">Each share needs a value from 0 to 100%, with up to 2 decimal places.</p>}

          <div className="counter-note">
            <button type="button" className="counter-note-toggle" aria-expanded={noteOpen} aria-controls={`${id}-note`} disabled={blocked} onClick={() => {
              setNoteOpen((open) => !open);
              if (!noteOpen) requestAnimationFrame(() => noteInput.current?.focus());
            }}><MessageSquarePlus size={16} />{noteOpen ? "Note" : note.trim() ? "Edit note" : "Add a note"}<span>Optional</span></button>
            {noteOpen && <textarea ref={noteInput} id={`${id}-note`} aria-label="Counter-offer note" rows={2} placeholder="Why this split?" value={note} disabled={blocked} onChange={(event) => props.onNoteChange(event.target.value)} />}
          </div>
          {(stale || finalized) && <div className="counter-send-error" role="alert"><span>{finalized ? "This SPLIT is signed. A counter offer can no longer be sent." : "A newer proposal is available. Reload its shares before sending."}</span>
            {!finalized && <button type="button" disabled={sending} onClick={props.onReload}>Reload proposal</button>}</div>}
          {props.error && <div className="counter-send-error" role="alert">{props.error}</div>}
        </div>

        <footer className="counter-offer-footer">
          <span role="status">{sending ? "Sending counter..." : !changed ? "No changes yet" : allocation.valid && !blocked ? "Ready to send" : ""}</span>
          <div><button type="button" className="counter-cancel split-press" disabled={sending} onClick={props.onClose}>Cancel</button>
            <button type="submit" className="counter-submit split-press" disabled={blocked || !allocation.valid || !changed} aria-busy={sending}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Send counter
            </button></div>
        </footer>
      </form>
    </DialogContent>
  </Dialog>;
}
