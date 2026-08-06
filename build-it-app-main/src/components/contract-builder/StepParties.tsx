import {
  CONTRIBUTION_OPTIONS,
  ROLE_OPTIONS,
  SPLIT_TYPE_OPTIONS,
  hasWriterIdentity,
  makeParty,
  partyDisplayName,
  sumPercents,
  type ContractData,
  type Party,
} from "./types";
import { AtSign, AlertCircle, CheckCircle2, ChevronDown, Mail, Phone, Plus, User, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMemo, useState, type ReactNode } from "react";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\d\s.-]+$/;

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

function inferInviteMethod(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (EMAIL_PATTERN.test(trimmed)) return "email";
  if (digits.length > 0 && PHONE_PATTERN.test(trimmed) && (trimmed.startsWith("+") || /^[\d(]/.test(trimmed))) return "phone";
  return "username";
}

function normalizeInviteValue(value: string, method: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (method === "username" && trimmed.startsWith("@")) return `@${trimmed.replace(/^@+/, "")}`;
  return trimmed;
}

export default function StepParties({ data, onChange }: Props) {
  const { parties } = data;
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const activeSplitType = data.splitType === "Equal" ? "Equal" : "Custom";
  const isEqualSplit = activeSplitType === "Equal";
  const total = useMemo(() => sumPercents(parties), [parties]);
  const valid = Math.abs(total - 100) < 0.01;
  const incompleteWriters = parties
    .map((party, index) => ({
      label: partyDisplayName(party) === "Invited collaborator" ? `Collaborator ${index + 1}` : partyDisplayName(party),
      missing: getMissingWriterItems(party),
    }))
    .filter((writer) => writer.missing.length > 0);
  const missingSummary = [
    !valid ? `Split total must equal 100% (${total}%)` : "",
    ...incompleteWriters.map((writer) => `${writer.label}: ${writer.missing.join(", ")}`),
  ].filter(Boolean);

  const update = <Key extends keyof Party>(id: string, field: Key, val: Party[Key]) =>
    onChange({ parties: parties.map((p) => (p.id === id ? { ...p, [field]: val } : p)) });

  const updateInvite = (id: string, rawValue: string) => {
    const method = inferInviteMethod(rawValue);
    const value = normalizeInviteValue(rawValue, method);

    onChange({
      parties: parties.map((party) => {
        if (party.id !== id) return party;

        return {
          ...party,
          inviteMethod: method,
          inviteValue: value,
          accountLinked: Boolean(value.trim()),
          splitId: "",
          email: method === "email" ? value : "",
          phoneNumber: method === "phone" ? value : "",
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
      makeParty({ role: "Contributor", percent: 0, signingOrder: parties.length + 1, inviteMethod: "username" }),
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
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold">Invite Collaborators</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Add the people who were part of the work, then start from an even split or propose custom percentages.
      </p>

      <div className="mb-5 rounded-lg border border-border bg-card/70 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Initial split</span>
          <div className="inline-flex rounded-full border border-border bg-background p-0.5">
            {SPLIT_TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => chooseSplitType(option)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  activeSplitType === option
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className={`ml-auto text-xs font-bold tabular-nums ${valid ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>
            {total}%
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              valid ? "bg-[hsl(var(--split-verified))]" : total > 100 ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        {!isEqualSplit && !valid && (
          <p className="mt-1.5 text-[11px] text-destructive">
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
                    Collaborator {i + 1}{p.isCurrentUser ? " · You" : ""}
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

              {!p.isCurrentUser && (
                <InviteWriter party={p} onInviteChange={(value) => updateInvite(p.id, value)} />
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
                <InputCell label="Split Share">
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

              <Collapsible
                open={Boolean(openNotes[p.id])}
                onOpenChange={(open) => setOpenNotes((current) => ({ ...current, [p.id]: open }))}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="mt-5 flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>Optional contribution note</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openNotes[p.id] ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <textarea
                    value={p.contributionDescription}
                    onChange={(event) => update(p.id, "contributionDescription", event.target.value)}
                    placeholder="Add a short note if the contribution needs context."
                    className="mt-3 min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30"
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
      </div>

      <button
        onClick={add}
        className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        <Plus className="h-3.5 w-3.5" />
        Invite another collaborator
      </button>

      {valid && incompleteWriters.length === 0 ? (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--split-verified))]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ready to continue
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 text-[hsl(var(--split-pending))]" />
          <span className="font-semibold text-[hsl(var(--split-pending))]">Required</span>
          {missingSummary.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteWriter({
  party,
  onInviteChange,
}: {
  party: Party;
  onInviteChange: (value: string) => void;
}) {
  const methodMeta = getInviteMethodMeta(party.inviteMethod, party.inviteValue);
  const MethodIcon = methodMeta?.icon;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invite</span>
        {methodMeta && MethodIcon && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <MethodIcon className="h-3 w-3" />
            {methodMeta.label}
          </span>
        )}
      </div>
      <input
        value={party.inviteValue}
        onChange={(event) => onInviteChange(event.target.value)}
        placeholder="@username, email, or phone"
        className="field-input"
      />
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        SPLIT will match this to an account when possible.
      </p>
    </div>
  );
}

function getInviteMethodMeta(method: string, value: string) {
  if (!value.trim()) return null;
  if (method === "email") return { label: "Email", icon: Mail };
  if (method === "phone") return { label: "Phone", icon: Phone };
  return { label: "Username", icon: AtSign };
}

function getMissingWriterItems(party: Party) {
  const missing: string[] = [];

  if (!hasWriterIdentity(party)) missing.push("username, email, or phone invite");
  if (Number(party.percent) <= 0) missing.push("split share");
  if (party.contributionCategories.length === 0) missing.push("contribution selection");

  return missing;
}

function InputCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
