import {
  ROLE_OPTIONS,
  SPLIT_TYPE_OPTIONS,
  hasWriterIdentity,
  makeParty,
  partyDisplayName,
  sumPercents,
  type ContractData,
  type Party,
} from "./types";
import type { UserProfile } from "@/lib/userProfile";
import { searchPublicProfiles, type PublicProfileSearchResult } from "@/lib/globalSearch";
import { filterCollaboratorSuggestions, type CollaboratorSuggestion } from "@/lib/collaboratorSuggestions";
import { AtSign, AlertCircle, CheckCircle2, Loader2, Mail, Phone, Plus, Search, User, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
  recentCollaborators?: CollaboratorSuggestion[];
  currentProfile?: UserProfile;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\d\s.-]+$/;
const COLLABORATOR_SEARCH_DEBOUNCE_MS = 220;

type InviteSearchResult = PublicProfileSearchResult & {
  email?: string;
  phoneNumber?: string;
  source?: "recent" | "worked-with" | "ecosystem";
  interactionCount?: number;
};

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

function clampPercent(value: string) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.min(100, Math.max(0, next));
}

export default function StepParties({ data, onChange, recentCollaborators = [], currentProfile }: Props) {
  const { parties } = data;
  const [percentDrafts, setPercentDrafts] = useState<Record<string, string>>({});
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

  const updatePercent = (id: string, rawValue: string) => {
    if (rawValue.trim() === "") {
      setPercentDrafts((current) => ({ ...current, [id]: "" }));
      update(id, "percent", 0);
      return;
    }

    const numericValue = Number(rawValue);
    const displayValue = numericValue > 100 ? "100" : numericValue < 0 ? "0" : rawValue;

    setPercentDrafts((current) => ({ ...current, [id]: displayValue }));
    update(id, "percent", clampPercent(displayValue));
  };

  const commitPercent = (id: string) => {
    const rawValue = percentDrafts[id];
    if (rawValue === undefined) return;

    update(id, "percent", rawValue.trim() === "" ? 0 : clampPercent(rawValue));
    setPercentDrafts((current) => {
      const { [id]: _discarded, ...rest } = current;
      return rest;
    });
  };

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

  const selectInviteSuggestion = (id: string, suggestion: InviteSearchResult) => {
    const username = cleanInviteToken(suggestion.username);
    const email = cleanInviteToken(suggestion.email);
    const phoneNumber = cleanInviteToken(suggestion.phoneNumber);
    const method = username ? "username" : email ? "email" : phoneNumber ? "phone" : "username";
    const inviteValue = username ? `@${username}` : email || phoneNumber || suggestion.displayName;
    const suggestedRole = firstRoleTag(suggestion.roleTags);
    const role = ROLE_OPTIONS.find((option) => option === suggestedRole);

    onChange({
      parties: parties.map((party) => {
        if (party.id !== id) return party;

        return {
          ...party,
          inviteMethod: method,
          inviteValue,
          accountLinked: true,
          splitId: "",
          email: method === "email" ? inviteValue : email,
          phoneNumber: method === "phone" ? inviteValue : phoneNumber,
          professionalName: suggestion.displayName || party.professionalName,
          role: role || party.role,
        };
      }),
    });
  };

  const chooseSplitType = (splitType: string) => {
    setPercentDrafts({});
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
                <InviteWriter
                  party={p}
                  recentCollaborators={recentCollaborators}
                  blockedSuggestionKeys={getBlockedSuggestionKeys(parties, p.id, currentProfile)}
                  onInviteChange={(value) => updateInvite(p.id, value)}
                  onInviteSelect={(suggestion) => selectInviteSuggestion(p.id, suggestion)}
                />
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
                      aria-label={`Split Share for ${partyDisplayName(p)}`}
                      min={0}
                      max={100}
                      step="0.01"
                      value={isEqualSplit ? p.percent : percentDrafts[p.id] ?? String(p.percent)}
                      disabled={isEqualSplit}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updatePercent(p.id, event.target.value)}
                      onBlur={() => commitPercent(p.id)}
                      className={`field-input tabular-nums ${isEqualSplit ? "cursor-not-allowed bg-secondary/60 text-muted-foreground" : ""}`}
                    />
                    <span className="text-sm font-semibold text-muted-foreground">%</span>
                  </div>
                  {isEqualSplit && (
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Calculated by Equal split.</p>
                  )}
                </InputCell>
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
  recentCollaborators,
  blockedSuggestionKeys,
  onInviteChange,
  onInviteSelect,
}: {
  party: Party;
  recentCollaborators: CollaboratorSuggestion[];
  blockedSuggestionKeys: Set<string>;
  onInviteChange: (value: string) => void;
  onInviteSelect: (suggestion: InviteSearchResult) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [ecosystemResults, setEcosystemResults] = useState<PublicProfileSearchResult[]>([]);
  const [searchingEcosystem, setSearchingEcosystem] = useState(false);
  const methodMeta = getInviteMethodMeta(party.inviteMethod, party.inviteValue);
  const MethodIcon = methodMeta?.icon;
  const query = party.inviteValue.trim();
  const searchQuery = query.replace(/^@+/, "");
  const recentMatches = useMemo(
    () =>
      filterCollaboratorSuggestions(recentCollaborators, query)
        .filter((suggestion) => !suggestionIsBlocked(suggestion, blockedSuggestionKeys)),
    [blockedSuggestionKeys, query, recentCollaborators],
  );
  const ecosystemMatches = useMemo(() => {
    const recentKeys = new Set(recentMatches.flatMap(getSuggestionKeys));

    return ecosystemResults
      .map((result) => ({ ...result, source: "ecosystem" as const }))
      .filter((result) => !suggestionIsBlocked(result, blockedSuggestionKeys))
      .filter((result) => !getSuggestionKeys(result).some((key) => recentKeys.has(key)))
      .slice(0, 5);
  }, [blockedSuggestionKeys, ecosystemResults, recentMatches]);
  const dropdownOpen = focused && (
    recentMatches.length > 0 ||
    ecosystemMatches.length > 0 ||
    searchingEcosystem ||
    searchQuery.trim().length >= 2
  );

  useEffect(() => {
    let active = true;
    const normalizedQuery = searchQuery.trim();

    if (!focused || normalizedQuery.length < 2) {
      setEcosystemResults([]);
      setSearchingEcosystem(false);
      return () => {
        active = false;
      };
    }

    setSearchingEcosystem(true);
    const searchTimer = window.setTimeout(() => {
      void searchPublicProfiles(normalizedQuery, 8).then((results) => {
        if (!active) return;
        setEcosystemResults(results);
        setSearchingEcosystem(false);
      });
    }, COLLABORATOR_SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(searchTimer);
    };
  }, [focused, searchQuery]);

  return (
    <div className="relative rounded-lg border border-border bg-background p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invite</span>
        {methodMeta && MethodIcon && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <MethodIcon className="h-3 w-3" />
            {methodMeta.label}
          </span>
        )}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={party.inviteValue}
          onChange={(event) => onInviteChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search @username, email, or phone"
          className="field-input pl-9"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
        />
      </div>
      {dropdownOpen && (
        <div
          className="absolute left-4 right-4 top-[calc(100%-0.75rem)] z-30 max-h-80 overflow-y-auto rounded-xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-xl"
          role="listbox"
          aria-label="Collaborator search results"
          onMouseDown={(event) => event.preventDefault()}
        >
          {recentMatches.length > 0 && (
            <InviteSearchSection title="Recent collaborators">
              {recentMatches.map((suggestion) => (
                <InviteSearchRow
                  key={`recent-${suggestionKey(suggestion)}`}
                  suggestion={suggestion}
                  label={suggestion.interactionCount > 1 ? "Worked with" : "Recent"}
                  onSelect={() => onInviteSelect(suggestion)}
                />
              ))}
            </InviteSearchSection>
          )}

          {(ecosystemMatches.length > 0 || searchingEcosystem) && (
            <InviteSearchSection title="SPLIT users">
              {ecosystemMatches.map((suggestion) => (
                <InviteSearchRow
                  key={`ecosystem-${suggestionKey(suggestion)}`}
                  suggestion={suggestion}
                  label="SPLIT user"
                  onSelect={() => onInviteSelect(suggestion)}
                />
              ))}
              {searchingEcosystem && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching SPLIT users
                </div>
              )}
            </InviteSearchSection>
          )}

          {recentMatches.length === 0 && ecosystemMatches.length === 0 && !searchingEcosystem && searchQuery.trim().length >= 2 && (
            <div className="px-3 py-5 text-center text-xs leading-5 text-muted-foreground">
              No matching SPLIT users yet. You can still invite by email or phone.
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Recent collaborators appear first. Type at least two characters to search the full SPLIT ecosystem.
      </p>
    </div>
  );
}

function InviteSearchSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-1">
      <p className="px-3 pb-1.5 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function InviteSearchRow({
  suggestion,
  label,
  onSelect,
}: {
  suggestion: InviteSearchResult;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      onMouseDown={onSelect}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
    >
      {suggestion.profileImageUrl ? (
        <img
          src={suggestion.profileImageUrl}
          alt=""
          className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <User className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{suggestion.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {suggestion.username ? `@${suggestion.username}` : suggestion.email || suggestion.phoneNumber || "SPLIT profile"}
          {suggestion.roleTags ? ` · ${suggestion.roleTags}` : ""}
        </span>
      </span>
      <span className="flex-shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
        {label}
      </span>
    </button>
  );
}

function getInviteMethodMeta(method: string, value: string) {
  if (!value.trim()) return null;
  if (method === "email") return { label: "Email", icon: Mail };
  if (method === "phone") return { label: "Phone", icon: Phone };
  return { label: "Username", icon: AtSign };
}

function cleanInviteToken(value?: string | null) {
  return (value ?? "").trim().replace(/^@+/, "");
}

function firstRoleTag(value?: string | null) {
  return (value ?? "").split(",")[0]?.trim() || "";
}

function normalizeSuggestionKey(value?: string | null) {
  return cleanInviteToken(value).toLowerCase();
}

function getSuggestionKeys(suggestion: InviteSearchResult) {
  return [
    suggestion.userId,
    suggestion.username,
    suggestion.email,
    suggestion.phoneNumber,
  ]
    .map(normalizeSuggestionKey)
    .filter(Boolean);
}

function suggestionKey(suggestion: InviteSearchResult) {
  return getSuggestionKeys(suggestion)[0] || normalizeSuggestionKey(suggestion.displayName) || "split-user";
}

function suggestionIsBlocked(suggestion: InviteSearchResult, blockedKeys: Set<string>) {
  return getSuggestionKeys(suggestion).some((key) => blockedKeys.has(key));
}

function getBlockedSuggestionKeys(parties: Party[], currentPartyId: string, currentProfile?: UserProfile) {
  const keys = new Set<string>();

  if (currentProfile) {
    [
      currentProfile.authUserId,
      currentProfile.username,
      currentProfile.emailAddress,
      [currentProfile.phoneCountryCode, currentProfile.phoneNumber].filter(Boolean).join(" "),
    ].map(normalizeSuggestionKey).filter(Boolean).forEach((key) => keys.add(key));
  }

  parties
    .filter((party) => party.id !== currentPartyId)
    .forEach((party) => {
      [
        party.inviteValue,
        party.email,
        party.phoneNumber,
        party.splitId,
      ].map(normalizeSuggestionKey).filter(Boolean).forEach((key) => keys.add(key));
    });

  return keys;
}

function getMissingWriterItems(party: Party) {
  const missing: string[] = [];

  if (!hasWriterIdentity(party)) missing.push("username, email, or phone invite");
  if (Number(party.percent) <= 0) missing.push("split share");

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
