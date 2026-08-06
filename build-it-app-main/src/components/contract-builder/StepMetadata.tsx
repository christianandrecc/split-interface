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

function FieldGroup({ icon: Icon, label, children }: { icon: ElementType; label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  max?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
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
      <h1 className="mb-1 text-xl font-bold">Create a New Work</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Start with only what collaborators need in the room. Registration and royalty details can come later.
      </p>

      <div className="space-y-6">
        <FieldGroup icon={Music} label="Work Title">
          <TextInput
            value={data.songTitle}
            onChange={(value) => onChange({ songTitle: value })}
            placeholder="e.g. Moonlight Sessions"
          />
        </FieldGroup>

        <FieldGroup icon={UserRound} label="Artist / Project">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">{signedInArtistName}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <LockKeyhole className="h-3 w-3" />
              <span className="hidden sm:inline">Signed-in profile</span>
            </span>
          </div>
        </FieldGroup>

        <FieldGroup icon={Calendar} label="Creation Date">
          <TextInput
            type="date"
            value={data.creationDate}
            max={today}
            onChange={handleCreationDateChange}
          />
        </FieldGroup>

        <Collapsible open={optionalDetailsOpen} onOpenChange={setOptionalDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/30"
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
            <div className="mt-4 space-y-6 rounded-lg border border-dashed border-border bg-card/60 p-4">
              <FieldGroup icon={FileText} label="Alternate Title">
                <TextInput
                  value={data.alternateTitles}
                  onChange={(value) => onChange({ alternateTitles: value })}
                  placeholder="Working title, remix title, optional"
                />
              </FieldGroup>

              <FieldGroup icon={NotebookPen} label="Session Notes">
                <textarea
                  value={data.workNotes}
                  onChange={(event) => onChange({ workNotes: event.target.value })}
                  placeholder="Optional notes for context, session, or creative intent."
                  className="min-h-28 w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </FieldGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
