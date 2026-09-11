import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { Calendar, ChevronDown, FileText, LockKeyhole, Music, NotebookPen, UserRound } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ContractData } from "./types";
import { getTodayDateInputValue } from "./types";

interface Props {
  data: ContractData;
  signedInArtistName: string;
  onChange: (d: Partial<ContractData>) => void;
}

function FieldGroup({ icon: Icon, label, children, htmlFor }: { icon: ElementType; label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  max,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  max?: string;
  id: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 min-w-0 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
    />
  );
}

export default function StepMetadata({ data, signedInArtistName, onChange }: Props) {
  const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(false);
  const today = getTodayDateInputValue();

  useEffect(() => {
    const nextData: Partial<ContractData> = {};

    if (!data.creationDate || data.creationDate > today) {
      nextData.creationDate = today;
    }

    if (data.artistProjectName !== signedInArtistName) {
      nextData.artistProjectName = signedInArtistName;
    }

    if (data.recordingArtist !== signedInArtistName) {
      nextData.recordingArtist = signedInArtistName;
    }

    if (Object.keys(nextData).length) {
      onChange(nextData);
    }
  }, [data.artistProjectName, data.creationDate, data.recordingArtist, onChange, signedInArtistName, today]);

  const handleCreationDateChange = (value: string) => {
    onChange({ creationDate: !value || value > today ? today : value });
  };

  return (
    <div>
      <h1 tabIndex={-1} className="mb-6 text-2xl font-bold outline-none">Create a New Work</h1>

      <div className="space-y-5">
        <FieldGroup icon={Music} label="Work Title" htmlFor="work-title">
          <TextInput
            id="work-title"
            value={data.songTitle}
            onChange={(value) => onChange({ songTitle: value })}
            placeholder="e.g. Work title"
          />
        </FieldGroup>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldGroup icon={UserRound} label="Artist / Project">
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <span className="min-w-0 break-words font-medium text-foreground">{signedInArtistName}</span>
              <span title="From your signed-in profile" className="shrink-0"><LockKeyhole aria-label="From your signed-in profile" className="h-3.5 w-3.5 text-muted-foreground" /></span>
            </div>
          </FieldGroup>

          <FieldGroup icon={Calendar} label="Creation Date" htmlFor="creation-date">
            <TextInput
              id="creation-date"
              type="date"
              value={data.creationDate}
              max={today}
              onChange={handleCreationDateChange}
            />
          </FieldGroup>
        </div>

        <Collapsible open={optionalDetailsOpen} onOpenChange={setOptionalDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between border-t border-border py-3 text-left text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Optional details
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${optionalDetailsOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4 space-y-4">
              <FieldGroup icon={FileText} label="Alternate Title" htmlFor="alternate-title">
                <TextInput
                  id="alternate-title"
                  value={data.alternateTitles}
                  onChange={(value) => onChange({ alternateTitles: value })}
                  placeholder="Working title, remix title, optional"
                />
              </FieldGroup>

              <FieldGroup icon={NotebookPen} label="Session Notes" htmlFor="session-notes">
                <textarea
                  id="session-notes"
                  value={data.workNotes}
                  onChange={(event) => onChange({ workNotes: event.target.value })}
                  placeholder="Optional notes for context, session, or creative intent."
                  className="min-h-24 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </FieldGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
