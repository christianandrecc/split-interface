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
      <h1 tabIndex={-1} className="mb-6 text-2xl font-bold outline-none">Invite Collaborators</h1>

      <div className="mb-2 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <fieldset className="flex items-center gap-3">
            <legend className="sr-only">Initial split</legend>
            <span aria-hidden="true" className="text-xs font-medium text-muted-foreground">Initial split</span>
            <div className="inline-flex gap-1 rounded-lg bg-muted/60 p-1">
              {SPLIT_TYPE_OPTIONS.map((option) => (
                <label key={option} className="relative cursor-pointer">
                  <input type="radio" name="split-method" value={option} checked={activeSplitType === option}
                    onChange={() => chooseSplitType(option)} className="peer sr-only" />
                  <span className="inline-flex h-9 items-center rounded-md border border-transparent px-3 text-xs font-semibold text-muted-foreground transition-colors peer-checked:border-border peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="text-right" role="status">
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums ${valid ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>
              {valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {total}% <span className="font-normal text-muted-foreground">/ 100%</span>
            </span>
            {!valid && <p className="mt-1 text-xs text-destructive">{total > 100 ? `Over by ${(total - 100).toFixed(2)}%` : `${(100 - total).toFixed(2)}% remaining`}</p>}
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {parties.map((p, i) => {
          const missingItems = getMissingWriterItems(p);
          return (
            <section key={p.id} aria-label={`Collaborator ${i + 1}`} className="py-4">
              <div className="mb-3 flex min-h-8 items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground">Collaborator {i + 1}{p.isCurrentUser ? " · You" : ""}</h2>
                {!p.isCurrentUser && parties.length > 1 && (
                  <button type="button" onClick={() => remove(p.id)}
                    className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                    title={`Remove ${partyDisplayName(p)}`} aria-label={`Remove ${partyDisplayName(p)}`}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_100px] items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,200px)_100px]">
                <div className="col-span-2 min-w-0 md:col-span-1">
                  {p.isCurrentUser ? (
                    <div>
                      <span className="mb-1 block text-xs font-medium text-muted-foreground">Artist / Name</span>
                      <div className="flex min-h-11 items-center rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
                        <span className="min-w-0 break-words">{partyDisplayName(p)}</span>
                      </div>
                    </div>
                  ) : (
                    <InviteWriter party={p} recentCollaborators={recentCollaborators}
                      blockedSuggestionKeys={getBlockedSuggestionKeys(parties, p.id, currentProfile)}
                      onInviteChange={(value) => updateInvite(p.id, value)}
                      onInviteSelect={(suggestion) => selectInviteSuggestion(p.id, suggestion)} />
                  )}
                </div>
                <InputCell label="Role on Composition">
                  <select value={p.role} aria-label={`Role on Composition for ${partyDisplayName(p)}`}
                    onChange={(event) => update(p.id, "role", event.target.value)} className="field-input h-11 min-w-0 py-2">
                    {!ROLE_OPTIONS.some((role) => role === p.role) && <option value={p.role}>{p.role || "Select role"}</option>}
                    {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
                  </select>
                </InputCell>
                <InputCell label="Split Share">
                  <div className="relative">
                    <input type="number" aria-label={`Split Share for ${partyDisplayName(p)}`}
                      min={0} max={100} step="0.01"
                      value={isEqualSplit ? p.percent : percentDrafts[p.id] ?? String(p.percent)}
                      disabled={isEqualSplit}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updatePercent(p.id, event.target.value)}
                      onBlur={() => commitPercent(p.id)}
                      className={`field-input h-11 py-2 pr-7 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isEqualSplit ? "cursor-not-allowed bg-secondary/60 text-muted-foreground" : ""}`} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </InputCell>
              </div>
              {missingItems.length > 0 && <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5 shrink-0" />Required: {missingItems.join(", ")}</p>}
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button type="button" onClick={add}
          className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-foreground hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <Plus className="h-4 w-4" />Invite another collaborator
        </button>
        {valid && incompleteWriters.length === 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--split-verified))]"><CheckCircle2 className="h-3.5 w-3.5" />Ready to continue</span>
        )}
      </div>
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
    <div className="relative min-w-0">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <label htmlFor={`invite-${party.id}`} className="min-w-0 truncate font-medium">{party.professionalName || "Invite"}</label>
        {methodMeta && MethodIcon && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs">
            <MethodIcon className="h-3 w-3" />
            {methodMeta.label}
          </span>
        )}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={`invite-${party.id}`}
          aria-label={`Invite for ${partyDisplayName(party)}`}
          value={party.inviteValue}
          onChange={(event) => onInviteChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search @username, email, or phone"
          className="field-input h-11 py-2 pl-9"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
        />
      </div>
      {dropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg"
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
              No matching SPLIT users. Email and phone entries only match verified accounts; no email or SMS is sent.
            </div>
          )}
        </div>
      )}
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
    <label className="min-w-0">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
