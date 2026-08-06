import { type ReactNode, useMemo, useState } from "react";
import AddressSearchField from "@/components/AddressSearchField";
import { normalizeUsername, type UserProfile } from "@/lib/userProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNationalPhoneNumber, getPhoneInputMaxLength } from "@/lib/phone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AtSign, Check, Eye, IdCard, Link2, Mail, MapPin, Music2, Save, Tags, User } from "lucide-react";

const proOptions = ["ASCAP", "BMI", "SESAC", "Other"];
const publishingStatusOptions = [
  "Self-published",
  "Unpublished",
  "Signed to publisher",
  "Admin by third party",
  "Co-published",
  "Unknown",
];

const creatorRoleOptions = ["Producer", "Writer", "Artist", "Engineer", "Topliner", "Manager", "Publisher"];
const visibilityOptions = ["Public", "Collaborators only", "Private"];

const countryOptions = [
  { value: "United States", label: "🇺🇸 United States" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Argentina", label: "🇦🇷 Argentina" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "Brazil", label: "🇧🇷 Brazil" },
  { value: "Chile", label: "🇨🇱 Chile" },
  { value: "China", label: "🇨🇳 China" },
  { value: "Colombia", label: "🇨🇴 Colombia" },
  { value: "Dominican Republic", label: "🇩🇴 Dominican Republic" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Jamaica", label: "🇯🇲 Jamaica" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "Mexico", label: "🇲🇽 Mexico" },
  { value: "Puerto Rico", label: "🇵🇷 Puerto Rico" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Other", label: "🌐 Other" },
];

const phoneCountries = [
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+1 CA", label: "🇨🇦 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+52", label: "🇲🇽 +52" },
  { value: "+57", label: "🇨🇴 +57" },
  { value: "+34", label: "🇪🇸 +34" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+81", label: "🇯🇵 +81" },
  { value: "+82", label: "🇰🇷 +82" },
];

type ProfilePageProps = {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onBackToPublicProfile?: () => void;
};

function requiresPublishingDetails(status?: string) {
  return ["Signed to publisher", "Admin by third party", "Co-published"].includes(status ?? "");
}

function isSimplePublishingSetup(status?: string) {
  return status === "Self-published" || status === "Unpublished";
}

export default function ProfilePage({ userProfile, onUpdateProfile, onBackToPublicProfile }: ProfilePageProps) {
  const [draft, setDraft] = useState<UserProfile>(userProfile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const displayName = useMemo(() => draft.displayName || buildLegalName(draft) || draft.emailAddress || "Your Profile", [draft]);
  const needsPublishingDetails = requiresPublishingDetails(draft.publishingStatus);
  const simplePublishingSetup = isSimplePublishingSetup(draft.publishingStatus);
  const phoneMaxLength = getPhoneInputMaxLength(draft.phoneCountryCode);
  const usernameAvailable = draft.username.length >= 3 && !["split", "admin", "support"].includes(draft.username);
  const selectedRoles = parseRoleTags(draft.roleTags);

  const update = (field: keyof UserProfile, value: string) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [field]: field === "username" ? normalizeUsername(value) : value }));
  };

  const toggleRoleTag = (role: string) => {
    setSaved(false);
    setDraft((current) => {
      const roles = parseRoleTags(current.roleTags);
      const nextRoles = roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role];
      return { ...current, roleTags: nextRoles.join(", ") };
    });
  };

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);

    try {
      await onUpdateProfile(normalizeProfile(draft));
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save profile to Supabase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-8">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage the account details SPLIT uses across your split sheets.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {onBackToPublicProfile && (
              <Button type="button" variant="outline" onClick={onBackToPublicProfile} className="h-11 md:px-5">
                Back to Profile
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="h-11 md:px-6">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
            {saveError}
          </div>
        )}

        <section className="mb-5 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {getInitials(displayName)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{displayName}</h2>
                <p className="truncate text-sm text-muted-foreground">{draft.username ? `@${draft.username}` : draft.emailAddress || "No handle saved"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:max-w-[58%] lg:justify-end">
              {creatorRoleOptions.map((role) => {
                const active = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRoleTag(role)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-5">
          <ProfileSection icon={<AtSign className="h-4 w-4" />} title="Creator Identity">
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="@Username" htmlFor="profileUsername">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">@</span>
                      <Input
                        id="profileUsername"
                        value={draft.username}
                        onChange={(event) => update("username", event.target.value)}
                        className="pl-7"
                        placeholder="yourname"
                      />
                    </div>
                    <p className={`mt-1 text-[11px] leading-4 ${usernameAvailable ? "text-[hsl(var(--split-verified))]" : "text-muted-foreground"}`}>
                      {usernameAvailable ? `@${draft.username} is ready for beta use.` : "Use at least 3 letters or numbers."}
                    </p>
                  </Field>
                  <Field label="Display Name" htmlFor="profileDisplayName">
                    <Input
                      id="profileDisplayName"
                      value={draft.displayName}
                      onChange={(event) => update("displayName", event.target.value)}
                      placeholder="Public name"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Location" htmlFor="profileLocation">
                    <Input
                      id="profileLocation"
                      value={draft.profileLocation}
                      onChange={(event) => update("profileLocation", event.target.value)}
                      placeholder="City, country"
                    />
                  </Field>
                  <Field label="Visibility" htmlFor="profileVisibility">
                    <Select value={draft.profileVisibility} onValueChange={(value) => update("profileVisibility", value)}>
                      <SelectTrigger id="profileVisibility">
                        <SelectValue placeholder="Choose visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Instagram" htmlFor="profileInstagram">
                    <Input id="profileInstagram" value={draft.socialInstagram} onChange={(event) => update("socialInstagram", event.target.value)} placeholder="@handle or URL" />
                  </Field>
                  <Field label="TikTok" htmlFor="profileTikTok">
                    <Input id="profileTikTok" value={draft.socialTikTok} onChange={(event) => update("socialTikTok", event.target.value)} placeholder="@handle or URL" />
                  </Field>
                  <Field label="X / Twitter" htmlFor="profileX">
                    <Input id="profileX" value={draft.socialX} onChange={(event) => update("socialX", event.target.value)} placeholder="@handle or URL" />
                  </Field>
                </div>
              </div>

              <CollaboratorProfilePreview profile={draft} displayName={displayName} />
            </div>
          </ProfileSection>

          <ProfileSection icon={<User className="h-4 w-4" />} title="Legal Identity">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Legal First Name" htmlFor="profileFirstName">
                <Input id="profileFirstName" value={draft.legalFirstName} onChange={(event) => update("legalFirstName", event.target.value)} />
              </Field>
              <Field label="Legal Middle Name" htmlFor="profileMiddleName">
                <Input id="profileMiddleName" value={draft.legalMiddleName} onChange={(event) => update("legalMiddleName", event.target.value)} />
              </Field>
              <Field label="Legal Last Name" htmlFor="profileLastName">
                <Input id="profileLastName" value={draft.legalLastName} onChange={(event) => update("legalLastName", event.target.value)} />
              </Field>
            </div>
            <Field label="P/K/A Names" htmlFor="profilePkaNames">
              <Input id="profilePkaNames" value={draft.pkaNames} onChange={(event) => update("pkaNames", event.target.value)} />
            </Field>
          </ProfileSection>

          <ProfileSection icon={<Mail className="h-4 w-4" />} title="Contact">
            <div className="grid gap-4 md:grid-cols-[160px_1fr]">
              <Field label="Country Code" htmlFor="profilePhoneCode">
                <Select
                  value={draft.phoneCountryCode}
                  onValueChange={(value) => {
                    update("phoneCountryCode", value);
                    update("phoneNumber", formatNationalPhoneNumber(draft.phoneNumber, value));
                  }}
                >
                  <SelectTrigger id="profilePhoneCode">
                    <SelectValue placeholder="Select code" />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneCountries.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Phone Number" htmlFor="profilePhone">
                <Input
                  id="profilePhone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={phoneMaxLength}
                  value={draft.phoneNumber}
                  onChange={(event) =>
                    update("phoneNumber", formatNationalPhoneNumber(event.target.value, draft.phoneCountryCode))
                  }
                  placeholder="555-000-0000"
                />
              </Field>
            </div>
            <Field label="Email Address" htmlFor="profileEmail">
              <Input id="profileEmail" inputMode="email" value={draft.emailAddress} onChange={(event) => update("emailAddress", event.target.value)} />
            </Field>
          </ProfileSection>

          <ProfileSection icon={<MapPin className="h-4 w-4" />} title="Legal Address">
            <Field label="Address" htmlFor="profileAddress">
              <AddressSearchField
                id="profileAddress"
                value={{
                  addressLine: draft.addressLine,
                  zipCode: draft.zipCode,
                  city: draft.city,
                  state: draft.state,
                  country: draft.country,
                }}
                onFieldChange={update}
                placeholder="Start typing your full legal address"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Zip Code" htmlFor="profileZip">
                <Input id="profileZip" value={draft.zipCode} onChange={(event) => update("zipCode", event.target.value)} />
              </Field>
              <Field label="City" htmlFor="profileCity">
                <Input id="profileCity" value={draft.city} onChange={(event) => update("city", event.target.value)} />
              </Field>
              <Field label="State" htmlFor="profileState">
                <Input id="profileState" value={draft.state} onChange={(event) => update("state", event.target.value)} />
              </Field>
              <Field label="Country" htmlFor="profileCountry">
                <Select value={draft.country} onValueChange={(value) => update("country", value)}>
                  <SelectTrigger id="profileCountry">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </ProfileSection>

          <ProfileSection icon={<Music2 className="h-4 w-4" />} title="Music Registration">
            <Field label="MLC Number" htmlFor="profileMlc">
              <Input id="profileMlc" value={draft.mlcNumber} onChange={(event) => update("mlcNumber", event.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="PRO Affiliation" htmlFor="profilePro">
                <Select value={draft.proAffiliation} onValueChange={(value) => update("proAffiliation", value)}>
                  <SelectTrigger id="profilePro">
                    <SelectValue placeholder="Select PRO" />
                  </SelectTrigger>
                  <SelectContent>
                    {proOptions.map((pro) => (
                      <SelectItem key={pro} value={pro}>
                        {pro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="IPI / CAE Number" htmlFor="profileIpi">
                <Input
                  id="profileIpi"
                  value={draft.ipiNumber ?? ""}
                  onChange={(event) => update("ipiNumber", event.target.value)}
                  placeholder="Optional"
                />
              </Field>
              {draft.proAffiliation === "Other" && (
                <Field label="PRO Name" htmlFor="profileCustomPro">
                  <Input id="profileCustomPro" value={draft.customProName ?? ""} onChange={(event) => update("customProName", event.target.value)} />
                </Field>
              )}
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-bold">Private Publishing Routing</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  SPLIT uses this in the background for final exports. Collaborators only see their own publishing details.
                </p>
              </div>
              <div className="space-y-4">
                <div className="md:max-w-md">
                  <Field label="Publishing Status" htmlFor="profilePublishingStatus">
                    <Select value={draft.publishingStatus ?? ""} onValueChange={(value) => update("publishingStatus", value)}>
                      <SelectTrigger id="profilePublishingStatus">
                        <SelectValue placeholder="Select publishing setup" />
                      </SelectTrigger>
                      <SelectContent>
                        {publishingStatusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {simplePublishingSetup && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-900">
                    <span className="font-semibold">Simple setup:</span> no publisher/admin fields needed. Your publishing share defaults to 100% of your writer share.
                  </div>
                )}

                {needsPublishingDetails && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Publisher / Admin Company" htmlFor="profilePublisherName">
                      <Input
                        id="profilePublisherName"
                        value={draft.publisherName ?? ""}
                        onChange={(event) => update("publisherName", event.target.value)}
                        placeholder="Company name"
                      />
                    </Field>
                    <Field label="Publisher IPI" htmlFor="profilePublisherIpi">
                      <Input
                        id="profilePublisherIpi"
                        value={draft.publisherIpi ?? ""}
                        onChange={(event) => update("publisherIpi", event.target.value)}
                        placeholder="Publisher IPI/CAE"
                      />
                    </Field>
                    <Field label="Publisher PRO / Society" htmlFor="profilePublisherPro">
                      <Input
                        id="profilePublisherPro"
                        value={draft.publisherPro ?? ""}
                        onChange={(event) => update("publisherPro", event.target.value)}
                        placeholder="ASCAP, BMI, SESAC, PRS..."
                      />
                    </Field>
                    <Field label="Your Publishing Share %" htmlFor="profilePublishingShare">
                      <Input
                        id="profilePublishingShare"
                        type="number"
                        min="0"
                        max="100"
                        value={draft.publishingShare ?? ""}
                        onChange={(event) => update("publishingShare", event.target.value)}
                        placeholder="Example: 50"
                      />
                    </Field>
                    <Field label="Admin Company (Optional)" htmlFor="profileAdminCompany">
                      <Input
                        id="profileAdminCompany"
                        value={draft.adminCompanyName ?? ""}
                        onChange={(event) => update("adminCompanyName", event.target.value)}
                        placeholder="If separate"
                      />
                    </Field>
                    <Field label="Admin Collection Share %" htmlFor="profileAdminShare">
                      <Input
                        id="profileAdminShare"
                        type="number"
                        min="0"
                        max="100"
                        value={draft.adminCollectionShare ?? ""}
                        onChange={(event) => update("adminCollectionShare", event.target.value)}
                        placeholder="Example: 10"
                      />
                    </Field>
                    <Field label="Publisher / Admin Contact" htmlFor="profilePublisherContact">
                      <Input
                        id="profilePublisherContact"
                        value={draft.publisherContact ?? ""}
                        onChange={(event) => update("publisherContact", event.target.value)}
                        placeholder="Registration email or contact"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </ProfileSection>

          <ProfileSection icon={<IdCard className="h-4 w-4" />} title="Sign In Details">
            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyDetail label="SPLIT ID" value={draft.splitId || "Generating..."} />
              <ReadOnlyDetail label="Account Email" value={draft.emailAddress || "Not set"} />
              <ReadOnlyDetail label="Password" value="Managed by sign in" />
            </div>
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    username: normalizeUsername(profile.username),
    displayName: (profile.displayName ?? "").trim(),
    profileImageUrl: (profile.profileImageUrl ?? "").trim(),
    roleTags: parseRoleTags(profile.roleTags).join(", "),
    socialInstagram: (profile.socialInstagram ?? "").trim(),
    socialTikTok: (profile.socialTikTok ?? "").trim(),
    socialX: (profile.socialX ?? "").trim(),
    socialWebsite: (profile.socialWebsite ?? "").trim(),
    profileLocation: (profile.profileLocation ?? "").trim(),
    profileVisibility: profile.profileVisibility || "Collaborators only",
    legalName: buildLegalName(profile),
    phoneNumber: formatNationalPhoneNumber(profile.phoneNumber, profile.phoneCountryCode),
    legalAddress: [profile.addressLine, profile.city, profile.state, profile.zipCode, profile.country]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", "),
    ipiNumber: (profile.ipiNumber ?? "").trim(),
    customProName: profile.proAffiliation === "Other" ? (profile.customProName ?? "").trim() : "",
    publishingStatus: (profile.publishingStatus ?? "").trim(),
    publisherName: requiresPublishingDetails(profile.publishingStatus) ? (profile.publisherName ?? "").trim() : "",
    publisherIpi: requiresPublishingDetails(profile.publishingStatus) ? (profile.publisherIpi ?? "").trim() : "",
    publisherPro: requiresPublishingDetails(profile.publishingStatus) ? (profile.publisherPro ?? "").trim() : "",
    publishingShare: isSimplePublishingSetup(profile.publishingStatus) ? "100" : (profile.publishingShare ?? "").trim(),
    adminCompanyName: requiresPublishingDetails(profile.publishingStatus) ? (profile.adminCompanyName ?? "").trim() : "",
    adminIpi: requiresPublishingDetails(profile.publishingStatus) ? (profile.adminIpi ?? "").trim() : "",
    adminCollectionShare: requiresPublishingDetails(profile.publishingStatus) ? (profile.adminCollectionShare ?? "").trim() : "",
    publisherContact: requiresPublishingDetails(profile.publishingStatus) ? (profile.publisherContact ?? "").trim() : "",
  };
}

function parseRoleTags(value: string) {
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function buildLegalName(profile: UserProfile) {
  return [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function CollaboratorProfilePreview({ profile, displayName }: { profile: UserProfile; displayName: string }) {
  const roles = parseRoleTags(profile.roleTags);
  const socials = [
    profile.socialInstagram,
    profile.socialTikTok,
    profile.socialX,
  ].filter(Boolean);

  return (
    <aside className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        Collaborator preview
      </div>
      <div className="flex items-start gap-3">
        {profile.profileImageUrl ? (
          <img src={profile.profileImageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {getInitials(displayName)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">{displayName}</h3>
          <p className="truncate text-sm font-medium text-primary">{profile.username ? `@${profile.username}` : "@username"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{profile.profileLocation || "Location not set"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {roles.length > 0 ? (
          roles.map((role) => (
            <span key={role} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Tags className="h-3 w-3" />
              {role}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No role tags yet.</span>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          {profile.profileVisibility || "Collaborators only"}
        </div>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          This controls who can see your collaborator card and released-work credits.
        </p>
      </div>

      {socials.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {socials.slice(0, 4).map((social) => (
            <div key={social} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              <span className="truncate">{social}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "Y"}${parts[1]?.[0] ?? "P"}`.toUpperCase();
}

function ProfileSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ReadOnlyDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
