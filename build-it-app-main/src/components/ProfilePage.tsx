import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import AccountEmailControl from "@/components/AccountEmailControl";
import AddressSearchField from "@/components/AddressSearchField";
import { CREATOR_ROLE_OPTIONS } from "@/lib/creatorRoles";
import { normalizeUserProfile, normalizeUsername, type UserProfile } from "@/lib/userProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNationalPhoneNumber, getPhoneInputMaxLength } from "@/lib/phone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContentEntrance } from "@/hooks/use-content-entrance";
import { ArrowLeft, AtSign, Check, Eye, HelpCircle, IdCard, Link2, Loader2, Lock, Mail, MapPin, Music2, RotateCcw, Tags, User } from "lucide-react";
import "./settings.css";
import "./profile-editor.css";

const proOptions = ["ASCAP", "BMI", "SESAC", "Other", "Skip PRO Registration"];

const visibilityOptions = ["Public", "Collaborators only", "Private"];

const profileCategories = [
  { id: "public", label: "Public profile", icon: AtSign, fields: ["username", "displayName", "profileLocation", "profileVisibility", "roleTags", "socialInstagram", "socialTikTok", "socialX"] },
  { id: "personal", label: "Personal details", icon: User, fields: ["legalFirstName", "legalMiddleName", "legalLastName", "pkaNames", "phoneCountryCode", "phoneNumber", "addressLine", "city", "state", "zipCode", "country"] },
  { id: "registration", label: "Registration", icon: Music2, fields: ["proAffiliation", "ipiNumber", "customProName"] },
  { id: "account", label: "Account", icon: IdCard, fields: [] },
] as const;

const usStateOptions = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

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

export default function ProfilePage({ userProfile, onUpdateProfile, onBackToPublicProfile }: ProfilePageProps) {
  return <ProfileEditor key={userProfile.authUserId || userProfile.splitId || "local"} userProfile={userProfile} onUpdateProfile={onUpdateProfile} onBackToPublicProfile={onBackToPublicProfile} />;
}

function ProfileEditor({ userProfile, onUpdateProfile, onBackToPublicProfile }: ProfilePageProps) {
  const [initialProfile] = useState(() => hydrateProfileForEditing(userProfile));
  const [draft, setDraft] = useState<UserProfile>(initialProfile);
  const [applied, setApplied] = useState<UserProfile>(initialProfile);
  const [category, setCategory] = useState("public");
  const [discardIntent, setDiscardIntent] = useState<"reset" | "leave" | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const previousProfile = useRef(userProfile);
  const inFlight = useRef(false);
  const alive = useRef(false);
  const isMobile = useIsMobile();
  const panelRef = useContentEntrance<HTMLDivElement>(category);
  const changes = (Object.keys(draft) as (keyof UserProfile)[]).filter(key => draft[key] !== applied[key]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!changes.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.length]);

  useEffect(() => {
    const previous = hydrateProfileForEditing({ ...previousProfile.current, splitId: previousProfile.current.splitId || initialProfile.splitId });
    const next = hydrateProfileForEditing({ ...userProfile, splitId: userProfile.splitId || initialProfile.splitId });
    const sameAccount = previous.authUserId === next.authUserId;
    // Auth confirmation may arrive while unrelated profile edits are still unsaved.
    setDraft(current => sameAccount ? Object.fromEntries(Object.entries(next).map(([key, value]) => [
      key, key === "emailAddress" || current[key as keyof UserProfile] === previous[key as keyof UserProfile]
        ? value : current[key as keyof UserProfile],
    ])) as UserProfile : next);
    previousProfile.current = userProfile;
    setApplied(next);
    setSaveError("");
  }, [userProfile, initialProfile.splitId]);

  const displayName = useMemo(() => draft.displayName || buildLegalName(draft) || draft.emailAddress || "Your Profile", [draft]);
  const phoneMaxLength = getPhoneInputMaxLength(draft.phoneCountryCode);
  const selectedRoles = parseRoleTags(draft.roleTags);

  const update = (field: keyof UserProfile, value: string) => {
    setSaved(false);
    setDraft((current) => {
      const next = { ...current, [field]: field === "username" ? normalizeUsername(value) : value };

      if (field === "country" && value !== current.country) {
        next.state = "";
      }

      if (field === "proAffiliation") {
        if (value === "Skip PRO Registration") {
          next.ipiNumber = "";
          next.customProName = "";
        } else if (value !== "Other") {
          next.customProName = "";
        }
      }


      return next;
    });
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
    if (inFlight.current || !changes.length) return;
    inFlight.current = true;
    setSaveError("");
    setSaving(true);
    const submitted = normalizeProfile(draft);

    try {
      await onUpdateProfile(submitted);
      if (alive.current) {
        setDraft(current => hydrateProfileForEditing({ ...submitted, emailAddress: current.emailAddress }));
        setApplied(current => hydrateProfileForEditing({ ...submitted, emailAddress: current.emailAddress }));
        setSaved(true);
      }
    } catch (error) {
      if (alive.current) setSaveError(error instanceof Error ? error.message : "Could not save your profile. Your changes are still here.");
    } finally {
      inFlight.current = false;
      if (alive.current) setSaving(false);
    }
  };

  return (
    <section className="settings-page profile-editor" aria-label="Edit Profile" aria-busy={saving}>
      <div className="settings-shell">
        <header className="settings-heading profile-heading">
            <h1>Edit Profile</h1>
            {onBackToPublicProfile && (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => changes.length ? setDiscardIntent("leave") : onBackToPublicProfile()}>
                <ArrowLeft size={16} />Back to Profile
              </Button>
            )}
        </header>
        <Tabs value={category} onValueChange={setCategory} orientation={isMobile ? "horizontal" : "vertical"} className="settings-layout">
          <TabsList className="settings-navigation" aria-label="Profile categories">
            {profileCategories.map(({ id, label, icon: Icon, fields }) => {
              const changed = fields.some(field => changes.includes(field));
              return <TabsTrigger key={id} value={id} className="settings-nav-item" aria-label={label} aria-description={changed ? "Unsaved changes" : undefined}>
                <Icon size={17} aria-hidden="true" /><span>{label}</span>
                {changed && <span className="settings-change-dot" aria-hidden="true" />}
              </TabsTrigger>;
            })}
          </TabsList>
          <div className="settings-detail profile-detail">
            <fieldset disabled={saving} className="min-w-0">
            <div ref={panelRef} className="profile-panels">
            <TabsContent value="public" className="settings-panel">
              <div className="settings-section-heading profile-section-heading">
                <span className="settings-section-icon"><AtSign size={18} /></span><h2>Public profile</h2>
                <Dialog>
                  <DialogTrigger asChild><Button type="button" variant="ghost" className="profile-preview-trigger"><Eye size={16} />Preview profile</Button></DialogTrigger>
                  <DialogContent className="profile-preview-dialog">
                    <DialogHeader><DialogTitle>Profile preview</DialogTitle><DialogDescription className="sr-only">Current public profile details. Unsaved changes are included in this preview.</DialogDescription></DialogHeader>
                    <CollaboratorProfilePreview profile={draft} displayName={displayName} />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="profile-fields">
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

                <fieldset className="profile-roles">
                  <legend>Creator roles</legend>
                  <div>{CREATOR_ROLE_OPTIONS.map(role => <label key={role}>
                    <Checkbox checked={selectedRoles.includes(role)} disabled={saving} onCheckedChange={() => toggleRoleTag(role)} />{role}
                  </label>)}</div>
                </fieldset>
                <div className="profile-socials">
                <h3>Social links</h3>
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
              </div>
            </TabsContent>
            <TabsContent value="personal" className="settings-panel">
              <div className="settings-section-heading"><span className="settings-section-icon"><User size={18} /></span><h2>Personal details</h2></div>
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
            <Field label="Artist Name" htmlFor="profilePkaNames" help="Optional public artist, producer, or songwriter name. Use the name collaborators know you by.">
              <Input id="profilePkaNames" value={draft.pkaNames} onChange={(event) => update("pkaNames", event.target.value)} placeholder="Artist name, producer name, alias" />
            </Field>
          </ProfileSection>

          <ProfileSection icon={<Mail className="h-4 w-4" />} title="Contact">
            <p className="profile-privacy-note"><Lock size={14} />Phone numbers and addresses stay private during beta.</p>
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
              {draft.country === "United States" ? (
                <Field label="State" htmlFor="profileState" help="Use the U.S. state tied to your legal address. SPLIT clears this when you change to a non-U.S. country.">
                  <Select value={draft.state} onValueChange={(value) => update("state", value)}>
                    <SelectTrigger id="profileState">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {usStateOptions.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field label="Province / Region" htmlFor="profileState" help="Use the province, region, state, or administrative area for your legal address.">
                  <Input id="profileState" value={draft.state} onChange={(event) => update("state", event.target.value)} />
                </Field>
              )}
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
            </TabsContent>
            <TabsContent value="registration" className="settings-panel">
          <ProfileSection icon={<Music2 className="h-4 w-4" />} title="Music Registration" primary>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="PRO Affiliation" htmlFor="profilePro" help="A PRO collects public performance royalties. You can find this in your ASCAP, BMI, SESAC, or society account. Choose Skip if you have not registered yet.">
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
              <Field label="IPI / CAE Number" htmlFor="profileIpi" help="Your songwriter identifier inside your PRO account. Leave it blank if you have not registered yet.">
                <Input
                  id="profileIpi"
                  value={draft.ipiNumber ?? ""}
                  onChange={(event) => update("ipiNumber", event.target.value)}
                  placeholder={draft.proAffiliation === "Skip PRO Registration" ? "Skipped for now" : "Optional"}
                  disabled={draft.proAffiliation === "Skip PRO Registration"}
                />
              </Field>
              {draft.proAffiliation === "Other" && (
                <Field label="PRO Name" htmlFor="profileCustomPro" help="Use this if your society is not listed above. Enter the society name from your registration account.">
                  <Input id="profileCustomPro" value={draft.customProName ?? ""} onChange={(event) => update("customProName", event.target.value)} />
                </Field>
              )}
            </div>

          </ProfileSection>
            </TabsContent>
            <TabsContent value="account" className="settings-panel">
          <ProfileSection icon={<IdCard className="h-4 w-4" />} title="Sign In Details" primary>
            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyDetail label="@Username" value={draft.username ? `@${draft.username}` : "Not set"} />
              <ReadOnlyDetail label="Password" value="Managed by sign in" />
            </div>
            <AccountEmailControl key={userProfile.authUserId || "signed-out"} userId={userProfile.authUserId} />
          </ProfileSection>
            </TabsContent>
            </div>
            </fieldset>
            <footer className="settings-footer profile-footer">
              {saveError && <p role="alert" className="profile-save-error">{saveError}</p>}
              <span role="status" className="settings-save-status" data-applied={saved && !changes.length}>
                {saved && !changes.length && <Check size={14} />}
                {saving ? "Saving..." : changes.length ? "Unsaved changes" : saved ? "Saved" : "No changes"}
              </span>
              <div className="settings-footer-actions">
                <Tooltip><TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" disabled={saving || !changes.length} aria-label="Discard changes" onClick={() => setDiscardIntent("reset")}><RotateCcw size={16} /></Button>
                </TooltipTrigger><TooltipContent>Discard changes</TooltipContent></Tooltip>
                <Button type="button" className="settings-apply" onClick={handleSave} disabled={saving || !changes.length}>
                  {saving ? <Loader2 className="animate-spin" /> : <Check />}Save Changes
                </Button>
              </div>
            </footer>
          </div>
        </Tabs>
        <AlertDialog open={discardIntent !== null} onOpenChange={open => { if (!open) setDiscardIntent(null); }}>
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
            <AlertDialogHeader><AlertDialogTitle>Discard profile changes?</AlertDialogTitle><AlertDialogDescription>Your unsaved changes in all profile categories will be discarded.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><Button variant="destructive" onClick={() => {
              const leave = discardIntent === "leave";
              setDraft(applied); setSaved(false); setSaveError(""); setDiscardIntent(null);
              if (leave) onBackToPublicProfile?.();
            }}>Discard changes</Button></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return normalizeUserProfile({
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
    legalName: buildLegalName(profile) || (profile.legalName ?? "").trim(),
    phoneNumber: formatNationalPhoneNumber(profile.phoneNumber, profile.phoneCountryCode),
    legalAddress: [profile.addressLine, profile.city, profile.state, profile.zipCode, profile.country]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", "),
    ipiNumber: profile.proAffiliation === "Skip PRO Registration" ? "" : (profile.ipiNumber ?? "").trim(),
    customProName: profile.proAffiliation === "Other" ? (profile.customProName ?? "").trim() : "",
  });
}

function hydrateProfileForEditing(profile: UserProfile): UserProfile {
  const normalized = normalizeUserProfile(profile);
  const legalAddressParts = normalized.legalAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (legalAddressParts.length < 2 || normalized.addressLine || normalized.city || normalized.state) {
    return normalized;
  }

  return normalizeUserProfile({
    ...normalized,
    addressLine: legalAddressParts[0] ?? normalized.addressLine,
    city: legalAddressParts[1] ?? normalized.city,
    state: legalAddressParts[2] ?? normalized.state,
    zipCode: legalAddressParts[3] ?? normalized.zipCode,
    country: legalAddressParts[4] ?? normalized.country,
  });
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
    { platform: "Instagram", value: profile.socialInstagram },
    { platform: "TikTok", value: profile.socialTikTok },
    { platform: "X / Twitter", value: profile.socialX },
  ].filter(social => social.value);

  return (
    <div className="profile-preview">
      <div className="flex items-start gap-3">
        {profile.profileImageUrl ? (
          <img src={profile.profileImageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {getInitials(displayName)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="break-words text-base font-bold">{displayName}</h3>
          <p className="break-all text-sm text-muted-foreground">{profile.username ? `@${profile.username}` : "@username"}</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{profile.profileLocation || "Location not set"}</p>
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

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          {profile.profileVisibility || "Collaborators only"}
        </div>
      </div>

      {socials.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {socials.map(({ platform, value }) => (
            <div key={platform} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              <span className="min-w-0 break-all"><span className="font-semibold">{platform}</span> {value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "?"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function ProfileSection({ icon, title, children, primary = false }: { icon: ReactNode; title: string; children: ReactNode; primary?: boolean }) {
  const Heading = primary ? "h2" : "h3";
  return (
    <section className="profile-section" data-primary={primary}>
      <div className={primary ? "settings-section-heading" : "profile-subheading"}>
        <span className={primary ? "settings-section-icon" : "profile-subsection-icon"}>{icon}</span>
        <Heading>{title}</Heading>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
  help,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <div className="profile-field space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
          {label}
        </Label>
        {help && <HelpTip content={help} />}
      </div>
      {children}
    </div>
  );
}

function HelpTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Help"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-5">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function ReadOnlyDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-readonly">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
