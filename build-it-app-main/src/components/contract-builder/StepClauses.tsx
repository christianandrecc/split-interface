import { type ElementType, type ReactNode } from "react";
import { Clock, FileQuestion, Music, UserRound } from "lucide-react";
import type { ContractData } from "./types";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
}

const SAMPLE_CHOICES = [
  {
    label: "No",
    value: "No sample or interpolation",
    helper: "This work does not use a sample or interpolation.",
  },
  {
    label: "Yes",
    value: "Sample",
    helper: "This work uses or may use pre-existing material.",
  },
  {
    label: "Unknown",
    value: "Unsure",
    helper: "You are not sure yet and want to flag it before collaborators approve.",
  },
] as const;

const SAMPLE_SECONDS_PRESETS = ["0-15 sec", "0-30 sec", "0-45 sec", "0-1:00 min"] as const;

function FieldGroup({ icon: Icon, label, children }: { icon: ElementType; label: string; children: ReactNode }) {
  return (
    <label>
      <span className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 min-w-0 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
    />
  );
}

export default function StepClauses({ data, onChange }: Props) {
  const selected = SAMPLE_CHOICES.find((choice) => choice.value === data.sampleStatus) ?? SAMPLE_CHOICES[0];
  const needsSampleDetails = selected.value === "Sample";

  return (
    <div>
      <h1 tabIndex={-1} className="mb-6 text-2xl font-bold outline-none">Sample Disclosure</h1>

      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-medium">
            <FileQuestion className="h-3.5 w-3.5" />
            Does this work contain a sample or interpolation?
          </legend>
          <div className="grid max-w-md grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
            {SAMPLE_CHOICES.map((choice) => (
              <label key={choice.value} className="relative cursor-pointer">
                <input type="radio" name="sample-status" value={choice.value}
                  checked={selected.value === choice.value}
                  className="peer sr-only"
                  onChange={() => {
                  const hasNoSample = choice.value === "No sample or interpolation";
                  const hasStructuredSample = choice.value === "Sample";
                  onChange({
                    sampleStatus: choice.value,
                    sampleClearanceStatus: hasNoSample ? "Not needed" : "Unsure",
                    sampleNotes: hasStructuredSample ? data.sampleNotes : "",
                    sampleOriginalArtist: hasStructuredSample ? data.sampleOriginalArtist : "",
                    sampleOriginalWork: hasStructuredSample ? data.sampleOriginalWork : "",
                    samplePortion: hasStructuredSample ? data.samplePortion : "",
                  });
                }} />
                <span className="flex h-10 items-center justify-center rounded-md border border-transparent text-sm font-semibold text-muted-foreground transition-colors peer-checked:border-border peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring">{choice.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{selected.helper}</p>
        </fieldset>

        {needsSampleDetails && (
          <section className="border-t border-border pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup icon={UserRound} label="Sample Artist">
                <TextInput
                  value={data.sampleOriginalArtist}
                  onChange={(value) => onChange({ sampleOriginalArtist: value })}
                  placeholder="Artist of the sampled work"
                />
              </FieldGroup>

              <FieldGroup icon={Music} label="Sample Title">
                <TextInput
                  value={data.sampleOriginalWork}
                  onChange={(value) => onChange({ sampleOriginalWork: value })}
                  placeholder="Title of the sampled work"
                />
              </FieldGroup>
            </div>

            <div className="mt-4">
              <FieldGroup icon={Clock} label="Seconds Used">
                <select
                  value={data.samplePortion}
                  onChange={(event) => onChange({ samplePortion: event.target.value })}
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Select range</option>
                  {SAMPLE_SECONDS_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </FieldGroup>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
