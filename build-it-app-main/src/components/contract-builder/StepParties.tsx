import {
  CONTRIBUTION_OPTIONS,
  PRO_OPTIONS,
  PUBLISHING_STATUS_OPTIONS,
  ROLE_OPTIONS,
  SPLIT_TYPE_OPTIONS,
  hasWriterIdentity,
  makeParty,
  partyDisplayName,
  sumPercents,
  type ContractData,
  type Party,
} from "./types";
import { AlertCircle, CheckCircle2, ChevronDown, Hash, Info, Mail, Phone, Plus, Settings2, User, X } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
}

const INVITE_METHODS = [
  { id: "splitId", label: "SPLIT ID", icon: Hash, placeholder: "SPL-1234-ABCD" },
  { id: "email", label: "Email", icon: Mail, placeholder: "writer@email.com" },
  { id: "phone", label: "Phone", icon: Phone, placeholder: "+1 (555) 000-0000" },
] as const;

function applyEqualSplits(parties: Party[]) {
  if (!parties.length) return parties;

  const baseCents = Math.floor(10000 / parties.length);
  const extraCents = 10000 - baseCents * parties.length;

  return parties.map((party, index) => ({
    ...party,
    percent: (baseCents + (index < extraCents ? 1 : 0)) / 100,
    signingOrder: index + 1,
  }));
}

export default function StepParties({ data, onChange }: Props) {
  const [openAdvancedWriters, setOpenAdvancedWriters] = useState<Record<string, boolean>>({});
  const { parties } = data;
  const activeSplitType = data.splitType === "Equal" ? "Equal" : "Custom";
  const isEqualSplit = activeSplitType === "Equal";
  const total = useMemo(() => sumPercents(parties), [parties]);
  const valid = Math.abs(total - 100) < 0.01;
  const incompleteWriters = parties
    .map((party, index) => ({
      label: partyDisplayName(party) === "Invited writer" ? `Writer ${index + 1}` : partyDisplayName(party),
      missing: getMissingWriterItems(party),
    }))
    .filter((writer) => writer.missing.length > 0);

  const update = <Key extends keyof Party>(id: string, field: Key, val: Party[Key]) =>
    onChange({ parties: parties.map((p) => (p.id === id ? { ...p, [field]: val } : p)) });

  const updateInvite = (id: string, method: string, value: string) => {
    onChange({
      parties: parties.map((party) => {
        if (party.id !== id) return party;

        return {
          ...party,
          inviteMethod: method,
          inviteValue: value,
          accountLinked: Boolean(value.trim()),
          splitId: method === "splitId" ? value : party.splitId,
          email: method === "email" ? value : party.email,
          phoneNumber: method === "phone" ? value : party.phoneNumber,
        };
      }),
    });
  };

  const toggleContribution = (id: string, contribution: string) => {
    const party = parties.find((p) => p.id === id);
    if (!party) return;
    const current = party.contributionCategories;
    update(
      id,
      "contributionCategories",
      current.includes(contribution)
        ? current.filter((item) => item !== contribution)
        : [...current, contribution],
    );
  };

  const chooseSplitType = (splitType: string) => {
    onChange({
      splitType,
      parties: splitType === "Equal" ? applyEqualSplits(parties) : parties,
    });
  };

  const add = () => {
    const nextParties = [
      ...parties,
      makeParty({ role: "Contributor", percent: 0, signingOrder: parties.length + 1, inviteMethod: "email" }),
    ];

    onChange({
      parties: isEqualSplit ? applyEqualSplits(nextParties) : nextParties,
    });
  };

  const remove = (id: string) => {
    const nextParties = parties
      .filter((p) => p.id !== id)
      .map((p, index) => ({ ...p, signingOrder: index + 1 }));

    onChange({
      parties:
        isEqualSplit || nextParties.length === 1
          ? applyEqualSplits(nextParties)
          : nextParties,
    });
  };
  const toggleAdvanced = (id: string) =>
    setOpenAdvancedWriters((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold">Writers & Composition Splits</h1>
        <InfoTooltip label="How SPLIT uses linked account info">
          SPLIT pulls country, PRO, IPI/CAE, publisher/admin routing, and contact metadata from each linked SPLIT account. You only need the collaborator's SPLIT ID, account email, or phone number to invite them.
        </InfoTooltip>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Add yourself once, then invite collaborators through their SPLIT account instead of re-entering their metadata.
      </p>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Split Method</div>
            <div className="mt-1 text-sm font-bold">{activeSplitType}</div>
          </div>
          <div className={`text-sm font-bold tabular-nums ${valid ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>
            {total}%
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {SPLIT_TYPE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => chooseSplitType(option)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                activeSplitType === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              valid ? "bg-[hsl(var(--split-verified))]" : total > 100 ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        {isEqualSplit ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Equal split automatically divides 100% across all writers and updates when writers are added or removed.
          </p>
        ) : !valid && (
          <p className="mt-2 text-xs text-destructive">
            {total > 100 ? `Over by ${(total - 100).toFixed(2)}%` : `${(100 - total).toFixed(2)}% remaining`}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {parties.map((p, i) => {
          const missingItems = getMissingWriterItems(p);

          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5 group">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Writer {i + 1}{p.isCurrentUser ? " · You" : ""}
                  </span>
                  <div className="text-sm font-bold">{partyDisplayName(p)}</div>
                </div>
                {missingItems.length > 0 ? (
                  <span className="ml-auto hidden rounded-full bg-[hsl(var(--split-pending)/0.12)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--split-pending))] md:inline-flex">
                    Needs {missingItems.length}
                  </span>
                ) : (
                  <span className="ml-auto hidden items-center gap-1 rounded-full bg-[hsl(var(--split-verified)/0.12)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--split-verified))] md:inline-flex">
                    <CheckCircle2 className="h-3 w-3" />
                    Ready
                  </span>
                )}
                {!p.isCurrentUser && parties.length > 1 && (
                  <button
                    onClick={() => remove(p.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${partyDisplayName(p)}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {p.isCurrentUser ? (
                <CurrentUserAccount party={p} />
              ) : (
                <InviteWriter party={p} onInviteChange={(method, value) => updateInvite(p.id, method, value)} />
              )}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InputCell label="Role on Composition">
                  <select
                    value={p.role}
                    onChange={(event) => update(p.id, "role", event.target.value)}
                    className="field-input"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </InputCell>
                <InputCell label="Writer Share">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={p.percent}
                      disabled={isEqualSplit}
                      onChange={(event) => update(p.id, "percent", Math.min(100, Math.max(0, Number(event.target.value))))}
                      className={`field-input tabular-nums ${isEqualSplit ? "cursor-not-allowed bg-secondary/60 text-muted-foreground" : ""}`}
                    />
                    <span className="text-sm font-semibold text-muted-foreground">%</span>
                  </div>
                  {isEqualSplit && (
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Calculated by Equal split.</p>
                  )}
                </InputCell>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-[11px] font-semibold text-muted-foreground">Contribution *</div>
                <div className="flex flex-wrap gap-2">
                  {CONTRIBUTION_OPTIONS.map((option) => {
                    const active = p.contributionCategories.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => toggleContribution(p.id, option)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {p.contributionCategories.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-[hsl(var(--split-pending))]">
                    Choose at least one contribution before continuing.
                  </p>
                )}
              </div>

              <div className="mt-5 rounded-lg border border-border bg-background">
                <button
                  type="button"
                  onClick={() => toggleAdvanced(p.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Settings2 className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Advanced writer options</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Optional notes and account metadata overrides for registration.
                    </span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openAdvancedWriters[p.id] ? "rotate-180" : ""}`} />
                </button>

                {openAdvancedWriters[p.id] && (
                  <AdvancedWriterOptions
                    party={p}
                    onUpdate={(field, value) => update(p.id, field, value)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={add}
        className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        <Plus className="h-3.5 w-3.5" />
        Invite another writer
      </button>

      <div className={`mt-5 rounded-lg border px-4 py-3 ${
        valid && incompleteWriters.length === 0
          ? "border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.07)]"
          : "border-[hsl(var(--split-pending)/0.28)] bg-[hsl(var(--split-pending)/0.07)]"
      }`}>
        <div className="flex items-start gap-3">
          {valid && incompleteWriters.length === 0 ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--split-verified))]" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--split-pending))]" />
          )}
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span>
                {valid && incompleteWriters.length === 0 ? "Writers are ready" : "To continue, finish these required items"}
              </span>
              <InfoTooltip label="What this ownership note means" placement="above">
                This confirms ownership shares in the composition. Publisher and administrator details are for registration and royalty routing only unless a separate publishing agreement is attached.
              </InfoTooltip>
            </div>
            {valid && incompleteWriters.length === 0 ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Writer shares total 100%, and every writer has a linked account identity plus contribution selections.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
                {!valid && (
                  <p>
                    Ownership total must equal 100%. Current total: <span className="font-semibold text-foreground">{total}%</span>.
                  </p>
                )}
                {incompleteWriters.map((writer) => (
                  <p key={writer.label}>
                    <span className="font-semibold text-foreground">{writer.label}:</span> {writer.missing.join(", ")}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTooltip({
  label,
  children,
  placement = "below",
}: {
  label: string;
  children: string;
  placement?: "above" | "below";
}) {
  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={label}
      >
        <Info className="h-4 w-4" />
      </button>
      <div
        className={`pointer-events-none absolute left-1/2 z-20 hidden w-[min(22rem,calc(100vw-3rem))] -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-normal leading-5 text-popover-foreground shadow-lg group-focus-within:block group-hover:block ${
          placement === "above" ? "bottom-9" : "top-9"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function InviteWriter({
  party,
  onInviteChange,
}: {
  party: Party;
  onInviteChange: (method: string, value: string) => void;
}) {
  const activeMethod = INVITE_METHODS.find((method) => method.id === party.inviteMethod) ?? INVITE_METHODS[1];

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {INVITE_METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onInviteChange(id, party.inviteValue)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              party.inviteMethod === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <input
        value={party.inviteValue}
        onChange={(event) => onInviteChange(party.inviteMethod, event.target.value)}
        placeholder={`Invite by ${activeMethod.label}: ${activeMethod.placeholder}`}
        className="field-input"
      />
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Their SPLIT account will provide legal name, PRO, country, IPI/CAE, and publisher/admin routing after they accept.
      </p>
    </div>
  );
}

function AdvancedWriterOptions({
  party,
  onUpdate,
}: {
  party: Party;
  onUpdate: <Key extends keyof Party>(field: Key, value: Party[Key]) => void;
}) {
  const showPublisherFields = ["Signed to publisher", "Admin by third party", "Co-published"].includes(party.publishingStatus);

  return (
    <div className="space-y-4 border-t border-border px-4 py-4">
      <InputCell label="Contribution Description">
        <textarea
          value={party.contributionDescription}
          onChange={(event) => onUpdate("contributionDescription", event.target.value)}
          placeholder="Optional. Add detail only if the contribution needs extra context."
          className="min-h-[84px] w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/50"
        />
      </InputCell>

      <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
        Publisher/admin information normally comes from the writer's SPLIT account and is used for registration and royalty routing. Override it here only if the account info is missing or needs a one-time correction for this split sheet.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InputCell label="PRO / Society Override">
          <select
            value={party.proAffiliation}
            onChange={(event) => onUpdate("proAffiliation", event.target.value)}
            className="field-input"
          >
            {PRO_OPTIONS.map((pro) => (
              <option key={pro}>{pro}</option>
            ))}
          </select>
        </InputCell>
        <InputCell label="IPI / CAE Override">
          <input
            value={party.ipiNumber}
            onChange={(event) => onUpdate("ipiNumber", event.target.value)}
            placeholder="Optional override"
            className="field-input"
          />
        </InputCell>
        <InputCell label="Publishing Status Override">
          <select
            value={party.publishingStatus}
            onChange={(event) => onUpdate("publishingStatus", event.target.value)}
            className="field-input"
          >
            {PUBLISHING_STATUS_OPTIONS.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </InputCell>
        <InputCell label="Publisher / Admin Entity">
          <input
            value={party.publisherName}
            onChange={(event) => onUpdate("publisherName", event.target.value)}
            placeholder={showPublisherFields ? "Publisher or admin" : "Optional"}
            className="field-input"
          />
        </InputCell>
        {showPublisherFields && (
          <>
            <InputCell label="Publisher IPI">
              <input
                value={party.publisherIpi}
                onChange={(event) => onUpdate("publisherIpi", event.target.value)}
                placeholder="Optional"
                className="field-input"
              />
            </InputCell>
            <InputCell label="Publisher / Admin Contact">
              <input
                value={party.publisherContact}
                onChange={(event) => onUpdate("publisherContact", event.target.value)}
                placeholder="registration contact email"
                className="field-input"
              />
            </InputCell>
          </>
        )}
      </div>

      <InputCell label="Registration Notes">
        <textarea
          value={party.registrationNotes}
          onChange={(event) => onUpdate("registrationNotes", event.target.value)}
          placeholder="Optional notes for PRO/MLC/publisher routing."
          className="min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/50"
        />
      </InputCell>
    </div>
  );
}

function CurrentUserAccount({ party }: { party: Party }) {
  return (
    <div className="rounded-lg border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.07)] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[hsl(var(--split-verified))]">
        <CheckCircle2 className="h-4 w-4" />
        Linked to your SPLIT account
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <AccountMeta label="SPLIT ID" value={party.splitId} />
        <AccountMeta label="Email" value={party.email} />
        <AccountMeta label="Phone" value={party.phoneNumber || "Not saved"} />
        <AccountMeta label="Country" value={party.country} />
        <AccountMeta label="PRO" value={party.proAffiliation === "Other" ? party.customProName || "Other" : party.proAffiliation} />
        <AccountMeta label="Legal Name" value={party.legalName} />
      </div>
    </div>
  );
}

function AccountMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-xs font-bold">{value || "Pending"}</div>
    </div>
  );
}

function getMissingWriterItems(party: Party) {
  const missing: string[] = [];

  if (!hasWriterIdentity(party)) missing.push("SPLIT ID, account email, or phone invite");
  if (Number(party.percent) <= 0) missing.push("writer share");
  if (party.contributionCategories.length === 0) missing.push("contribution selection");

  return missing;
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
