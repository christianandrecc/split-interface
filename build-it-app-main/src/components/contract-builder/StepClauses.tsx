import {
  CLEARANCE_STATUS_OPTIONS,
  SAMPLE_STATUS_OPTIONS,
  type ContractData,
} from "./types";
import { FileQuestion } from "lucide-react";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
}

export default function StepClauses({ data, onChange }: Props) {
  const hasPreExistingMaterial = data.sampleStatus !== "No sample or interpolation";

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Sample & Interpolation Check</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Confirm whether the composition uses a sample, interpolation, replay, or other pre-existing material.
      </p>

      <div className="space-y-8">
        <section>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileQuestion className="h-3.5 w-3.5" />
            Sample / Interpolation / Pre-existing Material
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            {SAMPLE_STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange({
                    sampleStatus: option,
                    sampleClearanceStatus: option === "No sample or interpolation" ? "Not needed" : data.sampleClearanceStatus,
                  });
                }}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  data.sampleStatus === option
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {hasPreExistingMaterial && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-xs font-bold text-foreground">Clearance Details</div>
              <div className="grid gap-3 md:grid-cols-2">
                <InputCell label="Original Work">
                  <input
                    value={data.sampleOriginalWork}
                    onChange={(event) => onChange({ sampleOriginalWork: event.target.value })}
                    placeholder="Original song or work title"
                    className="field-input"
                  />
                </InputCell>
                <InputCell label="Original Artist">
                  <input
                    value={data.sampleOriginalArtist}
                    onChange={(event) => onChange({ sampleOriginalArtist: event.target.value })}
                    placeholder="Artist name"
                    className="field-input"
                  />
                </InputCell>
                <InputCell label="Original Writers">
                  <input
                    value={data.sampleOriginalWriters}
                    onChange={(event) => onChange({ sampleOriginalWriters: event.target.value })}
                    placeholder="Known writers"
                    className="field-input"
                  />
                </InputCell>
                <InputCell label="Original Publishers">
                  <input
                    value={data.sampleOriginalPublishers}
                    onChange={(event) => onChange({ sampleOriginalPublishers: event.target.value })}
                    placeholder="Known publishers"
                    className="field-input"
                  />
                </InputCell>
                <InputCell label="Master Owner">
                  <input
                    value={data.sampleMasterOwner}
                    onChange={(event) => onChange({ sampleMasterOwner: event.target.value })}
                    placeholder="Only if an actual sample is used"
                    className="field-input"
                  />
                </InputCell>
                <InputCell label="Portion / Timestamp">
                  <input
                    value={data.samplePortion}
                    onChange={(event) => onChange({ samplePortion: event.target.value })}
                    placeholder="0:42-0:47, hook lyric, melody phrase"
                    className="field-input"
                  />
                </InputCell>
                <InputCell label="Clearance Status">
                  <select
                    value={data.sampleClearanceStatus}
                    onChange={(event) => onChange({ sampleClearanceStatus: event.target.value })}
                    className="field-input"
                  >
                    {CLEARANCE_STATUS_OPTIONS.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </InputCell>
                <InputCell label="Agreed Share to Original Rights Holders">
                  <input
                    value={data.sampleAgreedShare}
                    onChange={(event) => onChange({ sampleAgreedShare: event.target.value })}
                    placeholder="Optional percentage or notes"
                    className="field-input"
                  />
                </InputCell>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InputCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
