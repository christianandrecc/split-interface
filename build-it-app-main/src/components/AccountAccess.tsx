import { type FormEvent, type ReactNode, useState } from "react";
import splitLogo from "@/assets/split-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, LogIn, UserPlus } from "lucide-react";

export type UserProfile = {
  splitId: string;
  legalName: string;
  legalFirstName: string;
  legalMiddleName: string;
  legalLastName: string;
  pkaNames: string;
  phoneCountryCode: string;
  phoneNumber: string;
  emailAddress: string;
  legalAddress: string;
  addressLine: string;
  zipCode: string;
  city: string;
  state: string;
  country: string;
  mlcNumber: string;
  proAffiliation: string;
  ipiNumber: string;
  customProName: string;
  publishingStatus: string;
  publisherName: string;
  publisherIpi: string;
  publisherPro: string;
  publishingShare: string;
  adminCompanyName: string;
  adminIpi: string;
  adminCollectionShare: string;
  publisherContact: string;
};

export function createSplitId() {
  return `SPL-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function createEmptyProfile(): UserProfile {
  return {
    splitId: createSplitId(),
    legalName: "",
    legalFirstName: "",
    legalMiddleName: "",
    legalLastName: "",
    pkaNames: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    emailAddress: "",
    legalAddress: "",
    addressLine: "",
    zipCode: "",
    city: "",
    state: "",
    country: "United States",
    mlcNumber: "",
    proAffiliation: "",
    ipiNumber: "",
    customProName: "",
    publishingStatus: "",
    publisherName: "",
    publisherIpi: "",
    publisherPro: "",
    publishingShare: "",
    adminCompanyName: "",
    adminIpi: "",
    adminCollectionShare: "",
    publisherContact: "",
  };
}

export function normalizeUserProfile(profile: Partial<UserProfile>): UserProfile {
  const base = createEmptyProfile();
  return {
    ...base,
    ...profile,
    splitId: profile.splitId || base.splitId,
  };
}

type AccountStep = {
  field: keyof UserProfile;
  label: string;
  description: string;
  placeholder: string;
  required?: boolean;
};

const accountSteps: AccountStep[] = [
  {
    field: "legalName",
    label: "Legal Name",
    description: "Use one legal name consistently across split sheets, registrations, and signatures.",
    placeholder: "John Doe",
    required: true,
  },
  {
    field: "pkaNames",
    label: "P/K/A Names",
    description: "Add artist names, producer names, aliases, or other public names.",
    placeholder: "Artist name, other names",
  },
  {
    field: "phoneNumber",
    label: "Phone Number",
    description: "Add the best contact number for account and split sheet updates.",
    placeholder: "(555) 000-0000",
    required: true,
  },
  {
    field: "emailAddress",
    label: "Email Address",
    description: "This email will be used for sign in, notifications, and signatures.",
    placeholder: "name@example.com",
    required: true,
  },
  {
    field: "legalAddress",
    label: "Legal Address",
    description: "Use the legal mailing address for contract records. Choose a suggested address to auto-fill the rest.",
    placeholder: "123 Main St",
    required: true,
  },
  {
    field: "mlcNumber",
    label: "MLC Number",
    description: "Add this if you have it. You can leave it blank for now.",
    placeholder: "Optional",
  },
  {
    field: "proAffiliation",
    label: "PRO Affiliation",
    description: "Choose your performing rights organization and add your IPI / CAE number if you have it.",
    placeholder: "Select PRO affiliation",
  },
  {
    field: "publishingStatus",
    label: "Publishing Info",
    description: "Add the private publishing details SPLIT should use in the background for registration-ready exports.",
    placeholder: "Select publishing setup",
  },
];

const publishingStatusOptions = [
  "Self-published",
  "Unpublished",
  "Signed to publisher",
  "Admin by third party",
  "Co-published",
  "Unknown",
];

const phoneCountries = [
  { value: "+1", label: "🇺🇸 +1", country: "United States" },
  { value: "+1 CA", label: "🇨🇦 +1", country: "Canada" },
  { value: "+54", label: "🇦🇷 +54", country: "Argentina" },
  { value: "+61", label: "🇦🇺 +61", country: "Australia" },
  { value: "+55", label: "🇧🇷 +55", country: "Brazil" },
  { value: "+56", label: "🇨🇱 +56", country: "Chile" },
  { value: "+86", label: "🇨🇳 +86", country: "China" },
  { value: "+506", label: "🇨🇷 +506", country: "Costa Rica" },
  { value: "+1 DO", label: "🇩🇴 +1", country: "Dominican Republic" },
  { value: "+593", label: "🇪🇨 +593", country: "Ecuador" },
  { value: "+503", label: "🇸🇻 +503", country: "El Salvador" },
  { value: "+33", label: "🇫🇷 +33", country: "France" },
  { value: "+49", label: "🇩🇪 +49", country: "Germany" },
  { value: "+502", label: "🇬🇹 +502", country: "Guatemala" },
  { value: "+504", label: "🇭🇳 +504", country: "Honduras" },
  { value: "+91", label: "🇮🇳 +91", country: "India" },
  { value: "+353", label: "🇮🇪 +353", country: "Ireland" },
  { value: "+39", label: "🇮🇹 +39", country: "Italy" },
  { value: "+1 JM", label: "🇯🇲 +1", country: "Jamaica" },
  { value: "+81", label: "🇯🇵 +81", country: "Japan" },
  { value: "+82", label: "🇰🇷 +82", country: "South Korea" },
  { value: "+44", label: "🇬🇧 +44", country: "United Kingdom" },
  { value: "+52", label: "🇲🇽 +52", country: "Mexico" },
  { value: "+505", label: "🇳🇮 +505", country: "Nicaragua" },
  { value: "+507", label: "🇵🇦 +507", country: "Panama" },
  { value: "+51", label: "🇵🇪 +51", country: "Peru" },
  { value: "+351", label: "🇵🇹 +351", country: "Portugal" },
  { value: "+1 PR", label: "🇵🇷 +1", country: "Puerto Rico" },
  { value: "+27", label: "🇿🇦 +27", country: "South Africa" },
  { value: "+34", label: "🇪🇸 +34", country: "Spain" },
  { value: "+46", label: "🇸🇪 +46", country: "Sweden" },
  { value: "+41", label: "🇨🇭 +41", country: "Switzerland" },
  { value: "+971", label: "🇦🇪 +971", country: "United Arab Emirates" },
  { value: "+598", label: "🇺🇾 +598", country: "Uruguay" },
  { value: "+58", label: "🇻🇪 +58", country: "Venezuela" },
  { value: "+57", label: "🇨🇴 +57", country: "Colombia" },
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
  { value: "Costa Rica", label: "🇨🇷 Costa Rica" },
  { value: "Dominican Republic", label: "🇩🇴 Dominican Republic" },
  { value: "Ecuador", label: "🇪🇨 Ecuador" },
  { value: "El Salvador", label: "🇸🇻 El Salvador" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "Guatemala", label: "🇬🇹 Guatemala" },
  { value: "Honduras", label: "🇭🇳 Honduras" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Ireland", label: "🇮🇪 Ireland" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Jamaica", label: "🇯🇲 Jamaica" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Mexico", label: "🇲🇽 Mexico" },
  { value: "Nicaragua", label: "🇳🇮 Nicaragua" },
  { value: "Panama", label: "🇵🇦 Panama" },
  { value: "Peru", label: "🇵🇪 Peru" },
  { value: "Portugal", label: "🇵🇹 Portugal" },
  { value: "Puerto Rico", label: "🇵🇷 Puerto Rico" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "United Arab Emirates", label: "🇦🇪 United Arab Emirates" },
  { value: "Uruguay", label: "🇺🇾 Uruguay" },
  { value: "Venezuela", label: "🇻🇪 Venezuela" },
  { value: "Other", label: "🌐 Other" },
];

const addressSuggestions = [
  {
    addressLine: "1500 Broadway",
    zipCode: "10036",
    city: "New York",
    state: "NY",
    country: "United States",
  },
  {
    addressLine: "1600 Vine Street",
    zipCode: "90028",
    city: "Los Angeles",
    state: "CA",
    country: "United States",
  },
  {
    addressLine: "10 Music Square East",
    zipCode: "37203",
    city: "Nashville",
    state: "TN",
    country: "United States",
  },
];

type AccountAccessProps = {
  initialProfile?: UserProfile | null;
  onCreateAccount: (profile: UserProfile) => void;
  onSignIn: (emailAddress: string) => void;
};

export default function AccountAccess({ initialProfile, onCreateAccount, onSignIn }: AccountAccessProps) {
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [profile, setProfile] = useState<UserProfile>(() =>
    initialProfile ? normalizeUserProfile(initialProfile) : createEmptyProfile()
  );
  const [signInEmail, setSignInEmail] = useState("");
  const [accountStep, setAccountStep] = useState(0);
  const [proHelpSelected, setProHelpSelected] = useState(false);

  const currentStep = accountSteps[accountStep];
  const progress = ((accountStep + 1) / accountSteps.length) * 100;
  const isLastStep = accountStep === accountSteps.length - 1;

  const updateProfile = (field: keyof UserProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleCreateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLastStep) {
      setAccountStep((step) => step + 1);
      return;
    }

    onCreateAccount(normalizeProfile(profile));
  };

  const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSignIn(signInEmail);
  };

  return (
    <main className="min-h-screen bg-background text-foreground safe-top safe-bottom">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[0.86fr_1.14fr]">
        <section className="flex flex-col justify-between border-b border-border bg-card px-6 py-6 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
          <div className="flex items-center gap-3">
            <img src={splitLogo} alt="SPLIT" className="h-9 w-9" />
            <div>
              <div className="text-sm font-bold tracking-tight">SPLIT</div>
              <div className="text-xs text-muted-foreground">Song ownership split sheets</div>
            </div>
          </div>

          <div className="py-10 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account setup</p>
            <h1 className="mt-4 max-w-md text-3xl font-bold tracking-tight md:text-4xl">
              Your creator details, ready for every split sheet.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Save the legal and professional information SPLIT needs before starting new split sheets.
            </p>
          </div>

          <div className="hidden rounded-lg border border-border bg-secondary/50 p-4 text-xs leading-5 text-muted-foreground lg:block">
            Profile details can later connect to Supabase authentication and pre-fill writers, signatures, and split sheet metadata.
          </div>
        </section>

        <section className="flex items-start justify-center px-4 py-6 md:px-8 lg:items-center lg:py-10">
          <div className="w-full max-w-2xl">
            <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-secondary p-1">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors ${
                  mode === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors ${
                  mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            </div>

            {mode === "create" ? (
              <form onSubmit={handleCreateAccount} className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>
                      Step {accountStep + 1} of {accountSteps.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="min-h-[260px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Account Creation</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight">{currentStep.label}</h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{currentStep.description}</p>

                  <div className="mt-7">
                    {renderAccountStep({
                      step: currentStep,
                      profile,
                      updateProfile,
                      proHelpSelected,
                      setProHelpSelected,
                    })}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-4"
                    disabled={accountStep === 0}
                    onClick={() => setAccountStep((step) => Math.max(0, step - 1))}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="h-11 flex-1 md:flex-none md:px-8">
                    {isLastStep ? "Continue to SPLIT" : "Next"}
                    {!isLastStep && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="space-y-4">
                  <Field label="Email Address" htmlFor="signInEmail">
                    <Input
                      id="signInEmail"
                      type="text"
                      inputMode="email"
                      value={signInEmail}
                      onChange={(event) => setSignInEmail(event.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </Field>

                  <Field label="Password" htmlFor="signInPassword">
                    <Input id="signInPassword" type="password" placeholder="Enter password" required />
                  </Field>
                </div>

                <Button type="submit" className="mt-6 h-11 w-full">
                  Sign In
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function requiresPublishingDetails(status?: string) {
  return ["Signed to publisher", "Admin by third party", "Co-published"].includes(status ?? "");
}

function isSimplePublishingSetup(status?: string) {
  return status === "Self-published" || status === "Unpublished";
}

function renderAccountStep({
  step,
  profile,
  updateProfile,
  proHelpSelected,
  setProHelpSelected,
}: {
  step: AccountStep;
  profile: UserProfile;
  updateProfile: (field: keyof UserProfile, value: string) => void;
  proHelpSelected: boolean;
  setProHelpSelected: (selected: boolean) => void;
}) {
  if (step.field === "legalName") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          <NameField label="Legal First Name" htmlFor="legalFirstName">
            <Input
              id="legalFirstName"
              value={profile.legalFirstName ?? ""}
              onChange={(event) => updateProfile("legalFirstName", event.target.value)}
              placeholder="John"
              required
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </NameField>
          <NameField label="Legal Middle Name (Optional)" htmlFor="legalMiddleName">
            <Input
              id="legalMiddleName"
              value={profile.legalMiddleName ?? ""}
              onChange={(event) => updateProfile("legalMiddleName", event.target.value)}
              placeholder="Quincy"
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </NameField>
          <NameField label="Legal Last Name" htmlFor="legalLastName">
            <Input
              id="legalLastName"
              value={profile.legalLastName ?? ""}
              onChange={(event) => updateProfile("legalLastName", event.target.value)}
              placeholder="Doe"
              required
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </NameField>
        </div>
        <p className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Stick to one legal name for your SPLIT account so contracts, royalty records, and signatures stay consistent.
        </p>
      </div>
    );
  }

  if (step.field === "phoneNumber") {
    return (
      <Field label={step.label} htmlFor={step.field}>
        <div className="grid gap-3 md:grid-cols-[150px_1fr]">
          <Select value={profile.phoneCountryCode} onValueChange={(value) => updateProfile("phoneCountryCode", value)}>
            <SelectTrigger className="h-12 rounded-full px-5 shadow-sm shadow-foreground/5">
              <SelectValue placeholder="🇺🇸 +1" />
            </SelectTrigger>
            <SelectContent>
              {phoneCountries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label} {country.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id={step.field}
            type="tel"
            value={profile.phoneNumber ?? ""}
            onChange={(event) => updateProfile("phoneNumber", event.target.value)}
            placeholder="(555) 000-0000"
            required={step.required}
            className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
          />
        </div>
      </Field>
    );
  }

  if (step.field === "legalAddress") {
    const matchingSuggestions = addressSuggestions.filter((suggestion) =>
      suggestion.addressLine.toLowerCase().includes((profile.addressLine ?? "").toLowerCase().trim()),
    );

    return (
      <div className="space-y-4">
        <Field label="Address" htmlFor="addressLine">
          <Input
            id="addressLine"
            value={profile.addressLine ?? ""}
            onChange={(event) => updateProfile("addressLine", event.target.value)}
            placeholder="Example: 1500 Broadway"
            required
            className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
          />
        </Field>

        {(profile.addressLine ?? "") && matchingSuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Suggested addresses</p>
            <div className="grid gap-2">
              {matchingSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.addressLine}-${suggestion.zipCode}`}
                  type="button"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-left text-xs leading-5 shadow-sm transition-colors hover:bg-secondary"
                  onClick={() => {
                    updateProfile("addressLine", suggestion.addressLine);
                    updateProfile("zipCode", suggestion.zipCode);
                    updateProfile("city", suggestion.city);
                    updateProfile("state", suggestion.state);
                    updateProfile("country", suggestion.country);
                  }}
                >
                  {suggestion.addressLine}, {suggestion.city}, {suggestion.state} {suggestion.zipCode}, {suggestion.country}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Zip Code" htmlFor="zipCode">
            <Input
              id="zipCode"
              value={profile.zipCode ?? ""}
              onChange={(event) => updateProfile("zipCode", event.target.value)}
              placeholder="10036"
              required
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </Field>
          <Field label="City" htmlFor="city">
            <Input
              id="city"
              value={profile.city ?? ""}
              onChange={(event) => updateProfile("city", event.target.value)}
              placeholder="New York"
              required
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </Field>
          <Field label="State" htmlFor="state">
            <Input
              id="state"
              value={profile.state ?? ""}
              onChange={(event) => updateProfile("state", event.target.value)}
              placeholder="NY"
              required
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </Field>
          <Field label="Country" htmlFor="country">
            <Select value={profile.country} onValueChange={(value) => updateProfile("country", value)}>
              <SelectTrigger id="country" className="h-12 rounded-full px-5 shadow-sm shadow-foreground/5">
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
      </div>
    );
  }

  if (step.field === "mlcNumber") {
    return (
      <Field label={step.label} htmlFor={step.field}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            id={step.field}
            value={profile.mlcNumber ?? ""}
            onChange={(event) => updateProfile("mlcNumber", event.target.value)}
            placeholder="Optional"
            className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
          />
        </div>
        <button
            type="button"
          className="mt-2 text-left text-xs font-semibold text-primary hover:underline"
            onClick={() => updateProfile("mlcNumber", "Create MLC account later")}
          >
          Don&apos;t have an MLC account? Create one
        </button>
      </Field>
    );
  }

  if (step.field === "proAffiliation") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={step.label} htmlFor={step.field}>
            <Select value={profile.proAffiliation} onValueChange={(value) => updateProfile("proAffiliation", value)}>
              <SelectTrigger id={step.field} className="h-12">
                <SelectValue placeholder={step.placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASCAP">ASCAP</SelectItem>
                <SelectItem value="BMI">BMI</SelectItem>
                <SelectItem value="SESAC">SESAC</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="IPI / CAE Number" htmlFor="ipiNumber">
            <Input
              id="ipiNumber"
              value={profile.ipiNumber ?? ""}
              onChange={(event) => updateProfile("ipiNumber", event.target.value)}
              placeholder="Optional"
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </Field>
        </div>
        <button
          type="button"
          className="text-left text-xs font-semibold text-primary hover:underline"
          onClick={() => {
            updateProfile("proAffiliation", "Other");
            setProHelpSelected(true);
          }}
        >
          Not Signed With a PRO? Click Here
        </button>
        {profile.proAffiliation === "Other" && (
          <Field label="PRO Name" htmlFor="customProName">
            <Input
              id="customProName"
              value={profile.customProName ?? ""}
              onChange={(event) => updateProfile("customProName", event.target.value)}
              placeholder="Enter PRO name"
              className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
            />
          </Field>
        )}
        {proHelpSelected && (
          <p className="text-xs leading-5 text-muted-foreground">
            No problem. This profile is marked as Other for now, and we can add a dedicated unsigned status later.
          </p>
        )}
      </div>
    );
  }

  if (step.field === "publishingStatus") {
    return (
      <div className="space-y-5">
        <Field label="Publishing Status" htmlFor="publishingStatus">
          <Select value={profile.publishingStatus ?? ""} onValueChange={(value) => updateProfile("publishingStatus", value)}>
            <SelectTrigger id="publishingStatus" className="h-12 text-base md:text-sm">
              <SelectValue placeholder="Select your publishing setup" />
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

        {isSimplePublishingSetup(profile.publishingStatus) && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-900">
            <span className="font-semibold">Simple setup:</span> no publisher/admin fields needed. SPLIT will use your account PRO and IPI/CAE for your controlled publishing share.
          </div>
        )}

        {requiresPublishingDetails(profile.publishingStatus) && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Publisher / Admin Company" htmlFor="publisherName">
                <Input
                  id="publisherName"
                  value={profile.publisherName ?? ""}
                  onChange={(event) => updateProfile("publisherName", event.target.value)}
                  placeholder="Company name"
                  className="h-12 text-base md:text-sm"
                />
              </Field>
              <Field label="Publisher IPI" htmlFor="publisherIpi">
                <Input
                  id="publisherIpi"
                  value={profile.publisherIpi ?? ""}
                  onChange={(event) => updateProfile("publisherIpi", event.target.value)}
                  placeholder="Publisher IPI/CAE if available"
                  className="h-12 text-base md:text-sm"
                />
              </Field>
              <Field label="Publisher PRO / Society" htmlFor="publisherPro">
                <Input
                  id="publisherPro"
                  value={profile.publisherPro ?? ""}
                  onChange={(event) => updateProfile("publisherPro", event.target.value)}
                  placeholder="ASCAP, BMI, SESAC, PRS, SGAE..."
                  className="h-12 text-base md:text-sm"
                />
              </Field>
              <Field label="Your Publishing Share %" htmlFor="publishingShare">
                <Input
                  id="publishingShare"
                  type="number"
                  min="0"
                  max="100"
                  value={profile.publishingShare ?? ""}
                  onChange={(event) => updateProfile("publishingShare", event.target.value)}
                  placeholder="Example: 50"
                  className="h-12 text-base md:text-sm"
                />
              </Field>
              <Field label="Admin Company (Optional)" htmlFor="adminCompanyName">
                <Input
                  id="adminCompanyName"
                  value={profile.adminCompanyName ?? ""}
                  onChange={(event) => updateProfile("adminCompanyName", event.target.value)}
                  placeholder="If separate from publisher"
                  className="h-12 text-base md:text-sm"
                />
              </Field>
              <Field label="Admin Collection Share %" htmlFor="adminCollectionShare">
                <Input
                  id="adminCollectionShare"
                  type="number"
                  min="0"
                  max="100"
                  value={profile.adminCollectionShare ?? ""}
                  onChange={(event) => updateProfile("adminCollectionShare", event.target.value)}
                  placeholder="Example: 10"
                  className="h-12 text-base md:text-sm"
                />
              </Field>
            </div>

            <Field label="Publisher / Admin Contact" htmlFor="publisherContact">
              <Input
                id="publisherContact"
                value={profile.publisherContact ?? ""}
                onChange={(event) => updateProfile("publisherContact", event.target.value)}
                placeholder="Registration email or contact"
                className="h-12 text-base md:text-sm"
              />
            </Field>
          </>
        )}
      </div>
    );
  }

  return (
    <Field label={step.label} htmlFor={step.field}>
      <Input
        id={step.field}
        type={step.field === "phoneNumber" ? "tel" : "text"}
        inputMode={step.field === "emailAddress" ? "email" : undefined}
        value={profile[step.field] ?? ""}
        onChange={(event) => updateProfile(step.field, event.target.value)}
        placeholder={step.placeholder}
        required={step.required}
        className="h-12 text-base md:text-sm"
      />
    </Field>
  );
}

function normalizeProfile(profile: UserProfile): UserProfile {
  const normalized = normalizeUserProfile(profile);
  const legalName = [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const legalAddress = [profile.addressLine, profile.city, profile.state, profile.zipCode, profile.country]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const publishingStatus = (profile.publishingStatus ?? "").trim();
  const needsPublishingDetails = requiresPublishingDetails(publishingStatus);

  return {
    ...normalized,
    legalName,
    legalAddress,
    ipiNumber: (profile.ipiNumber ?? "").trim(),
    customProName: profile.proAffiliation === "Other" ? (profile.customProName ?? "").trim() : "",
    publishingStatus,
    publisherName: needsPublishingDetails ? (profile.publisherName ?? "").trim() : "",
    publisherIpi: needsPublishingDetails ? (profile.publisherIpi ?? "").trim() : "",
    publisherPro: needsPublishingDetails ? (profile.publisherPro ?? "").trim() : "",
    publishingShare: isSimplePublishingSetup(publishingStatus) ? "100" : (profile.publishingShare ?? "").trim(),
    adminCompanyName: needsPublishingDetails ? (profile.adminCompanyName ?? "").trim() : "",
    adminIpi: needsPublishingDetails ? (profile.adminIpi ?? "").trim() : "",
    adminCollectionShare: needsPublishingDetails ? (profile.adminCollectionShare ?? "").trim() : "",
    publisherContact: needsPublishingDetails ? (profile.publisherContact ?? "").trim() : "",
  };
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function NameField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="flex min-h-8 items-end text-xs font-semibold leading-4 text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
