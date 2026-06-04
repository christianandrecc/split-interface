import { REGISTRATION_CONTACT_OPTIONS, RELEASE_STATUS_OPTIONS, type ContractData } from "./types";
import { CalendarClock, Contact, Disc3, FileCheck2, Hash, Send } from "lucide-react";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
}

export default function StepRights({ data, onChange }: Props) {
  const showReleaseFields = data.releaseStatus === "Released";
  const showScheduledFields = data.releaseStatus === "Scheduled release";
  const showContactFields = !["All collaborators individually", "SPLIT-assisted export only", "Not decided"].includes(data.registrationContactType);
  const writersWithIpi = data.parties.filter((party) => party.ipiNumber.trim()).length;
  const writersWithPros = data.parties.filter((party) => !["Unknown", "None"].includes(party.proAffiliation)).length;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">PRO / MLC Registration Metadata</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Prepare the song ownership data needed for PRO, MLC, publisher, and admin registration.
      </p>

      <div className="space-y-8">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Registration readiness</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ReadinessCell label="Writer shares" value={`${data.parties.length} writers / 100%`} ready />
            <ReadinessCell label="IPI / CAE" value={`${writersWithIpi} of ${data.parties.length}`} ready={writersWithIpi === data.parties.length} />
            <ReadinessCell label="PRO / Society" value={`${writersWithPros} of ${data.parties.length}`} ready={writersWithPros === data.parties.length} />
          </div>
        </section>

        <section>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Disc3 className="h-3.5 w-3.5" />
            Recording Match
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <InputCell label="Recording Artist">
              <input
                value={data.recordingArtist}
                onChange={(event) => onChange({ recordingArtist: event.target.value })}
                placeholder="Artist performing the recording"
                className="field-input"
              />
            </InputCell>
            <InputCell label="Recording Title">
              <input
                value={data.recordingTitle}
                onChange={(event) => onChange({ recordingTitle: event.target.value })}
                placeholder={data.songTitle || "Recording title"}
                className="field-input"
              />
            </InputCell>
            <InputCell label="Related ISRC">
              <input
                value={data.relatedIsrc}
                onChange={(event) => onChange({ relatedIsrc: event.target.value })}
                placeholder="ISRC or pending"
                className="field-input"
              />
            </InputCell>
            <InputCell label="ISWC">
              <input
                value={data.iswc}
                onChange={(event) => onChange({ iswc: event.target.value })}
                placeholder="ISWC or pending"
                className="field-input"
              />
            </InputCell>
          </div>
        </section>

        <section>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Release Status
          </label>
          <div className="grid gap-2 md:grid-cols-3">
            {RELEASE_STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => onChange({ releaseStatus: option })}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  data.releaseStatus === option
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {showReleaseFields && (
              <InputCell label="Release Date">
                <input
                  type="date"
                  value={data.releaseDate}
                  onChange={(event) => onChange({ releaseDate: event.target.value })}
                  className="field-input"
                />
              </InputCell>
            )}
            {showScheduledFields && (
              <InputCell label="Expected Release Date">
                <input
                  type="date"
                  value={data.expectedReleaseDate}
                  onChange={(event) => onChange({ expectedReleaseDate: event.target.value })}
                  className="field-input"
                />
              </InputCell>
            )}
            <InputCell label="Distributor">
              <input
                value={data.distributor}
                onChange={(event) => onChange({ distributor: event.target.value })}
                placeholder="DistroKid, TuneCore, UnitedMasters..."
                className="field-input"
              />
            </InputCell>
            <InputCell label="Label">
              <input
                value={data.label}
                onChange={(event) => onChange({ label: event.target.value })}
                placeholder="Independent or label name"
                className="field-input"
              />
            </InputCell>
            <InputCell label="UPC">
              <input
                value={data.upc}
                onChange={(event) => onChange({ upc: event.target.value })}
                placeholder="Optional album/single UPC"
                className="field-input"
              />
            </InputCell>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <label
                htmlFor="registration-contact-type"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <Contact className="h-3.5 w-3.5" />
                Who Handles Registration?
              </label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose who should submit or route the final split information.
              </p>
            </div>
          </div>
          <select
            id="registration-contact-type"
            value={data.registrationContactType}
            onChange={(event) => onChange({ registrationContactType: event.target.value })}
            className="field-input max-w-xl font-semibold"
          >
            {REGISTRATION_CONTACT_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          {showContactFields && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InputCell label="Contact Name">
                <input
                  value={data.designatedContactName}
                  onChange={(event) => onChange({ designatedContactName: event.target.value })}
                  placeholder="Person or company"
                  className="field-input"
                />
              </InputCell>
              <InputCell label="Role / Authority">
                <input
                  value={data.designatedContactRole}
                  onChange={(event) => onChange({ designatedContactRole: event.target.value })}
                  placeholder="Manager, admin, publisher..."
                  className="field-input"
                />
              </InputCell>
              <InputCell label="Email">
                <input
                  value={data.designatedContactEmail}
                  onChange={(event) => onChange({ designatedContactEmail: event.target.value })}
                  placeholder="registration@email.com"
                  className="field-input"
                />
              </InputCell>
              <InputCell label="Registration Deadline">
                <input
                  type="date"
                  value={data.registrationDeadline}
                  onChange={(event) => onChange({ registrationDeadline: event.target.value })}
                  className="field-input"
                />
              </InputCell>
              <label className="md:col-span-2">
                <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Authority Notes</span>
                <textarea
                  value={data.designatedContactAuthority}
                  onChange={(event) => onChange({ designatedContactAuthority: event.target.value })}
                  placeholder="What this person/entity is allowed to submit or export."
                  className="min-h-[78px] w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/50"
                />
              </label>
            </div>
          )}
        </section>

        <div className="flex gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <Send className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p>
            Export and submission choices come next. This screen collects the metadata those linked PRO and MLC accounts need.
          </p>
        </div>
      </div>
    </div>
  );
}

function InputCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ReadinessCell({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-bold ${ready ? "text-[hsl(var(--split-verified))]" : "text-[hsl(var(--split-pending))]"}`}>
        {value}
      </div>
    </div>
  );
}
