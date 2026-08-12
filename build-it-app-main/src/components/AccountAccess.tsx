import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import splitLogo from "@/assets/split-logo.png";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { formatNationalPhoneNumber, getPhoneInputMaxLength } from "@/lib/phone";
import {
  isValidEmailAddress,
  normalizeEmailAddress,
  requestSupabasePasswordReset,
  updateSupabasePassword,
} from "@/lib/profileStorage";
import { createEmptyProfile, normalizeUserProfile, normalizeUsername, type UserProfile } from "@/lib/userProfile";
import { ArrowLeft, ArrowRight, HelpCircle, LogIn, ShieldCheck, UserPlus } from "lucide-react";

const TERMS_VERSION = "split-terms-2026-08-12";
const PRIVACY_VERSION = "split-privacy-2026-08-12";
const TERMS_URL = "/legal/terms.html";
const PRIVACY_URL = "/legal/privacy.html";

const accountPages = [
  {
    title: "Personal information",
    eyebrow: "Account Creation",
    description: "Set the public handle and contact details collaborators will use to find you on SPLIT.",
  },
  {
    title: "Professional information",
    eyebrow: "Creator Details",
    description: "Add the role, PRO, and publishing details SPLIT can use when split sheets become registration-ready.",
  },
  {
    title: "Security and consent",
    eyebrow: "Secure Sign In",
    description: "Create your password and confirm the policies attached to this SPLIT account.",
  },
];

const creatorRoleOptions = ["Producer", "Writer", "Artist", "Engineer", "Topliner"];
const proOptions = ["ASCAP", "BMI", "SESAC", "Other", "Skip PRO Registration"];
const publishingStatusOptions = ["Self-published", "Signed to publisher", "Co-published"];

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

type AccountAccessProps = {
  initialProfile?: UserProfile | null;
  forcePasswordReset?: boolean;
  onCreateAccount: (profile: UserProfile, password: string) => Promise<void>;
  onSignIn: (emailAddress: string, password: string) => Promise<void>;
  onPasswordResetComplete?: () => void;
};

export default function AccountAccess({
  initialProfile,
  forcePasswordReset = false,
  onCreateAccount,
  onSignIn,
  onPasswordResetComplete,
}: AccountAccessProps) {
  const [mode, setMode] = useState<"create" | "signin" | "forgot" | "reset">(
    forcePasswordReset || hasRecoveryUrl() ? "reset" : "create",
  );
  const [profile, setProfile] = useState<UserProfile>(() =>
    initialProfile ? normalizeUserProfile(initialProfile) : createEmptyProfile()
  );
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(Boolean(initialProfile?.termsAcceptedAt));
  const [acknowledgedPrivacy, setAcknowledgedPrivacy] = useState(Boolean(initialProfile?.privacyAcknowledgedAt));
  const [accountPage, setAccountPage] = useState(0);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPage = accountPages[accountPage];
  const progress = ((accountPage + 1) / accountPages.length) * 100;
  const isLastPage = accountPage === accountPages.length - 1;

  useEffect(() => {
    if (forcePasswordReset) setMode("reset");
  }, [forcePasswordReset]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setFormError("");
        setFormNotice("Enter a new password for your SPLIT account.");
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const selectedRoles = useMemo(() => parseRoleTags(profile.roleTags), [profile.roleTags]);

  const updateProfile = (field: keyof UserProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: field === "username" ? normalizeUsername(value) : value }));
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormNotice("");

    const pageError = validateAccountPage(accountPage, profile, accountPassword, accountPasswordConfirm, acceptedTerms, acknowledgedPrivacy);
    if (pageError) {
      setFormError(pageError);
      return;
    }

    if (!isLastPage) {
      setAccountPage((page) => page + 1);
      return;
    }

    try {
      setSubmitting(true);
      await onCreateAccount(prepareProfileForRegistration(profile), accountPassword);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create the Supabase account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormNotice("");

    const email = normalizeEmailAddress(signInEmail);
    if (!isValidEmailAddress(email)) {
      setFormError("Enter a valid email address.");
      return;
    }

    try {
      setSubmitting(true);
      await onSignIn(email, signInPassword);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not sign in to Supabase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormNotice("");

    try {
      setSubmitting(true);
      await requestSupabasePasswordReset(resetEmail);
      setFormNotice("If this email can receive reset messages, Supabase will send password reset instructions shortly.");
    } catch (error) {
      setFormNotice(error instanceof Error ? error.message : "If this email can receive reset messages, Supabase will send password reset instructions shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormNotice("");

    if (resetPassword.length < 8) {
      setFormError("Use at least 8 characters for your password.");
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      setFormError("The passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await updateSupabasePassword(resetPassword);
      setFormNotice("Password updated. You can continue using SPLIT.");
      onPasswordResetComplete?.();
      setMode("signin");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setSubmitting(false);
    }
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
              Save only what SPLIT needs to connect users, route split sheets, and protect account access.
            </p>
          </div>

          <div className="hidden rounded-lg border border-border bg-secondary/50 p-4 text-xs leading-5 text-muted-foreground lg:block">
            Passwords are handled only by Supabase Auth. SPLIT stores profile, role, consent, and split-sheet data in protected profile tables.
          </div>
        </section>

        <section className="flex items-start justify-center px-4 py-6 md:px-8 lg:items-center lg:py-10">
          <div className="w-full max-w-2xl">
            <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-secondary p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setFormError("");
                  setFormNotice("");
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors ${
                  mode === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setFormError("");
                  setFormNotice("");
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors ${
                  mode !== "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            </div>

            {mode === "create" && (
              <form onSubmit={handleCreateAccount} className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>
                      Page {accountPage + 1} of {accountPages.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="min-h-[420px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{currentPage.eyebrow}</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight">{currentPage.title}</h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{currentPage.description}</p>

                  <div className="mt-7">
                    {accountPage === 0 && (
                      <PersonalInformationPage
                        profile={profile}
                        updateProfile={updateProfile}
                      />
                    )}
                    {accountPage === 1 && (
                      <ProfessionalInformationPage
                        profile={profile}
                        selectedRoles={selectedRoles}
                        updateProfile={updateProfile}
                      />
                    )}
                    {accountPage === 2 && (
                      <SecurityConsentPage
                        password={accountPassword}
                        confirmPassword={accountPasswordConfirm}
                        acceptedTerms={acceptedTerms}
                        acknowledgedPrivacy={acknowledgedPrivacy}
                        onPasswordChange={setAccountPassword}
                        onConfirmPasswordChange={setAccountPasswordConfirm}
                        onTermsChange={setAcceptedTerms}
                        onPrivacyChange={setAcknowledgedPrivacy}
                      />
                    )}
                  </div>
                </div>

                <FeedbackMessage error={formError} notice={formNotice} />

                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-4"
                    disabled={accountPage === 0}
                    onClick={() => {
                      setFormError("");
                      setFormNotice("");
                      setAccountPage((page) => Math.max(0, page - 1));
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={submitting} className="h-11 flex-1 md:flex-none md:px-8">
                    {submitting ? "Saving..." : isLastPage ? "Create Account" : "Next"}
                    {!isLastPage && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            )}

            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Welcome back</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight">Sign in to SPLIT</h2>
                </div>
                <div className="space-y-4">
                  <Field label="Email Address" htmlFor="signInEmail" required>
                    <Input
                      id="signInEmail"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={signInEmail}
                      onChange={(event) => setSignInEmail(normalizeEmailAddress(event.target.value))}
                      placeholder="name@example.com"
                      required
                    />
                  </Field>

                  <Field label="Password" htmlFor="signInPassword" required>
                    <Input
                      id="signInPassword"
                      type="password"
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(event) => setSignInPassword(event.target.value)}
                      placeholder="Enter password"
                      required
                    />
                  </Field>
                </div>

                <FeedbackMessage error={formError} notice={formNotice} />

                <Button type="submit" disabled={submitting} className="mt-6 h-11 w-full">
                  {submitting ? "Signing in..." : "Sign In"}
                </Button>
                <button
                  type="button"
                  className="mt-4 w-full text-center text-xs font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode("forgot");
                    setFormError("");
                    setFormNotice("");
                    setResetEmail(signInEmail);
                  }}
                >
                  Forgot Password?
                </button>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Password reset</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight">Request reset email</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Enter your SPLIT account email. For privacy, we show the same message whether or not the email exists.
                  </p>
                </div>
                <Field label="Email Address" htmlFor="resetEmail" required>
                  <Input
                    id="resetEmail"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(normalizeEmailAddress(event.target.value))}
                    placeholder="name@example.com"
                    required
                  />
                </Field>

                <FeedbackMessage error={formError} notice={formNotice} />

                <Button type="submit" disabled={submitting} className="mt-6 h-11 w-full">
                  {submitting ? "Sending..." : "Send Reset Email"}
                </Button>
                <button
                  type="button"
                  className="mt-4 w-full text-center text-xs font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode("signin");
                    setFormError("");
                    setFormNotice("");
                  }}
                >
                  Back to Sign In
                </button>
              </form>
            )}

            {mode === "reset" && (
              <form onSubmit={handleResetPassword} className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Recovery session</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight">Create a new password</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Use at least 8 characters. SPLIT sends the new password only to Supabase Auth.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="New Password" htmlFor="resetPassword" required>
                    <Input
                      id="resetPassword"
                      type="password"
                      autoComplete="new-password"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      placeholder="8 characters minimum"
                      minLength={8}
                      required
                    />
                  </Field>
                  <Field label="Confirm New Password" htmlFor="resetPasswordConfirm" required>
                    <Input
                      id="resetPasswordConfirm"
                      type="password"
                      autoComplete="new-password"
                      value={resetPasswordConfirm}
                      onChange={(event) => setResetPasswordConfirm(event.target.value)}
                      placeholder="Repeat password"
                      minLength={8}
                      required
                    />
                  </Field>
                </div>

                <FeedbackMessage error={formError} notice={formNotice} />

                <Button type="submit" disabled={submitting} className="mt-6 h-11 w-full">
                  {submitting ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PersonalInformationPage({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (field: keyof UserProfile, value: string) => void;
}) {
  const normalizedUsername = normalizeUsername(profile.username);
  const available = normalizedUsername.length >= 3 && !["split", "admin", "support"].includes(normalizedUsername);
  const phoneMaxLength = getPhoneInputMaxLength(profile.phoneCountryCode);

  return (
    <div className="space-y-4">
      <Field label="Username" htmlFor="username" required help="Your public SPLIT handle. Collaborators can invite or credit you with @username.">
        <div className="relative">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">@</span>
          <Input
            id="username"
            value={profile.username ?? ""}
            onChange={(event) => updateProfile("username", normalizeUsername(event.target.value))}
            placeholder="yourname"
            required
            className="h-12 rounded-full pl-9 pr-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
          />
        </div>
        <p className={`mt-1 text-xs leading-5 ${available ? "text-[hsl(var(--split-verified))]" : "text-muted-foreground"}`}>
          {available ? `@${normalizedUsername} is ready for beta use.` : "Use at least 3 letters or numbers. Supabase enforces uniqueness when the account is created."}
        </p>
      </Field>

      <Field label="Email Address" htmlFor="emailAddress" required help="This is the email used for Supabase login, password recovery, and account notifications.">
        <Input
          id="emailAddress"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={profile.emailAddress ?? ""}
          onChange={(event) => updateProfile("emailAddress", normalizeEmailAddress(event.target.value))}
          placeholder="name@example.com"
          required
          className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
        />
      </Field>

      <Field label="Legal Name" htmlFor="legalName" required help="Use the name you would sign on a split sheet or registration document. You can find it on your legal ID or tax documents.">
        <Input
          id="legalName"
          value={profile.legalName ?? ""}
          onChange={(event) => updateProfile("legalName", event.target.value)}
          placeholder="Full legal name"
          required
          className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
        />
      </Field>

      <Field label="Artist Name" htmlFor="artistName" help="Optional public artist, producer, or songwriter name. Use the name collaborators know you by.">
        <Input
          id="artistName"
          value={profile.pkaNames ?? ""}
          onChange={(event) => {
            updateProfile("pkaNames", event.target.value);
            if (!profile.displayName) updateProfile("displayName", event.target.value);
          }}
          placeholder="Artist name, producer name, alias"
          className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
        />
      </Field>

      <Field label="Phone Number" htmlFor="phoneNumber" required help="Used for account recovery and split-sheet contact matching. Pick the country code, then enter the national number.">
        <div className="grid gap-3 md:grid-cols-[150px_1fr]">
          <Select
            value={profile.phoneCountryCode}
            onValueChange={(value) => {
              updateProfile("phoneCountryCode", value);
              updateProfile("phoneNumber", formatNationalPhoneNumber(profile.phoneNumber ?? "", value));
            }}
          >
            <SelectTrigger className="h-12 rounded-full px-5 shadow-sm shadow-foreground/5" aria-label="Phone country code">
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
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={phoneMaxLength}
            value={profile.phoneNumber ?? ""}
            onChange={(event) =>
              updateProfile("phoneNumber", formatNationalPhoneNumber(event.target.value, profile.phoneCountryCode))
            }
            placeholder="555-000-0000"
            required
            className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
          />
        </div>
      </Field>
    </div>
  );
}

function ProfessionalInformationPage({
  profile,
  selectedRoles,
  updateProfile,
}: {
  profile: UserProfile;
  selectedRoles: string[];
  updateProfile: (field: keyof UserProfile, value: string) => void;
}) {
  const skippedPro = profile.proAffiliation === "Skip PRO Registration";
  const needsPublishingDetails = requiresPublishingDetails(profile.publishingStatus);
  const simplePublishingSetup = isSimplePublishingSetup(profile.publishingStatus);

  return (
    <div className="space-y-5">
      <Field label="Roles" htmlFor="roleTags" required help="Select the roles that describe how people should credit you on SPLIT. These show on your creator profile.">
        <div id="roleTags" className="flex flex-wrap gap-2">
          {creatorRoleOptions.map((role) => {
            const active = selectedRoles.includes(role);

            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  const nextRoles = active
                    ? selectedRoles.filter((item) => item !== role)
                    : [...selectedRoles, role];
                  updateProfile("roleTags", nextRoles.join(", "));
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
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
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="PRO Affiliation" htmlFor="proAffiliation" help="A PRO collects public performance royalties. You can find this on your ASCAP, BMI, SESAC, or society account. Choose Skip if you have not registered yet.">
          <Select
            value={profile.proAffiliation}
            onValueChange={(value) => {
              updateProfile("proAffiliation", value);
              if (value === "Skip PRO Registration") {
                updateProfile("ipiNumber", "");
                updateProfile("customProName", "");
              }
            }}
          >
            <SelectTrigger id="proAffiliation" className="h-12">
              <SelectValue placeholder="Select PRO affiliation" />
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

        <Field label="IPI / CAE Number" htmlFor="ipiNumber" help="This is your songwriter identifier inside your PRO account. Leave it blank or skip PRO registration if you do not have one yet.">
          <Input
            id="ipiNumber"
            value={profile.ipiNumber ?? ""}
            onChange={(event) => updateProfile("ipiNumber", event.target.value)}
            placeholder={skippedPro ? "Skipped for now" : "Optional"}
            disabled={skippedPro}
            className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
          />
        </Field>
      </div>

      {profile.proAffiliation === "Other" && (
        <Field label="PRO Name" htmlFor="customProName" help="Use this if your society is not listed above. Enter the society name from your registration account.">
          <Input
            id="customProName"
            value={profile.customProName ?? ""}
            onChange={(event) => updateProfile("customProName", event.target.value)}
            placeholder="Enter PRO or society name"
            className="h-12 rounded-full px-5 text-base shadow-sm shadow-foreground/5 md:text-sm"
          />
        </Field>
      )}

      {skippedPro && (
        <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs leading-5 text-muted-foreground">
          SPLIT will let you create split sheets now. PRO details can be added later before registration exports.
        </div>
      )}

      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <Field label="Publishing Information" htmlFor="publishingStatus" help="Publishing details tell SPLIT whether you control your own publishing or work through a publisher. You can find this in your publishing/admin agreement.">
          <Select value={profile.publishingStatus ?? ""} onValueChange={(value) => updateProfile("publishingStatus", value)}>
            <SelectTrigger id="publishingStatus" className="h-12 text-base md:text-sm">
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

        {simplePublishingSetup && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-5 text-emerald-900">
            Self-published accounts default to 100% of their controlled publishing share.
          </div>
        )}

        {needsPublishingDetails && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Publisher / Admin Company" htmlFor="publisherName" help="The company that controls or administers your publishing. Look at your publishing or admin agreement.">
              <Input
                id="publisherName"
                value={profile.publisherName ?? ""}
                onChange={(event) => updateProfile("publisherName", event.target.value)}
                placeholder="Company name"
                className="h-12 text-base md:text-sm"
              />
            </Field>
            <Field label="Publisher IPI" htmlFor="publisherIpi" help="The publisher identifier from the publisher's PRO/society account.">
              <Input
                id="publisherIpi"
                value={profile.publisherIpi ?? ""}
                onChange={(event) => updateProfile("publisherIpi", event.target.value)}
                placeholder="Publisher IPI/CAE"
                className="h-12 text-base md:text-sm"
              />
            </Field>
            <Field label="Publisher PRO / Society" htmlFor="publisherPro" help="The society your publisher uses, such as ASCAP, BMI, PRS, SGAE, or another PRO.">
              <Input
                id="publisherPro"
                value={profile.publisherPro ?? ""}
                onChange={(event) => updateProfile("publisherPro", event.target.value)}
                placeholder="ASCAP, BMI, SESAC, PRS..."
                className="h-12 text-base md:text-sm"
              />
            </Field>
            <Field label="Your Publishing Share %" htmlFor="publishingShare" help="The percentage of publishing you control for your writer share. Check your publishing agreement if you have one.">
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
            <Field label="Publisher / Admin Contact" htmlFor="publisherContact" help="Registration email or contact for your publisher/admin team. This can usually be found in your agreement or company portal.">
              <Input
                id="publisherContact"
                value={profile.publisherContact ?? ""}
                onChange={(event) => updateProfile("publisherContact", event.target.value)}
                placeholder="Registration email or contact"
                className="h-12 text-base md:text-sm"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityConsentPage({
  password,
  confirmPassword,
  acceptedTerms,
  acknowledgedPrivacy,
  onPasswordChange,
  onConfirmPasswordChange,
  onTermsChange,
  onPrivacyChange,
}: {
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  acknowledgedPrivacy: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTermsChange: (value: boolean) => void;
  onPrivacyChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Create Password" htmlFor="accountPassword" required help="SPLIT sends this directly to Supabase Auth. We never store passwords in a profile table.">
          <Input
            id="accountPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="8 characters minimum"
            minLength={8}
            required
            className="h-12 text-base md:text-sm"
          />
        </Field>
        <Field label="Confirm Password" htmlFor="accountPasswordConfirm" required>
          <Input
            id="accountPasswordConfirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder="Repeat password"
            minLength={8}
            required
            className="h-12 text-base md:text-sm"
          />
        </Field>
      </div>

      <div className="rounded-lg border border-border bg-secondary/40 p-4 text-xs leading-5 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Password requirements
        </div>
        Use at least 8 characters. A longer password with letters, numbers, and symbols is recommended.
      </div>

      <div className="space-y-3">
        <ConsentRow
          checked={acceptedTerms}
          onCheckedChange={onTermsChange}
          id="termsAccepted"
          label={
            <>
              I accept the{" "}
              <a href={TERMS_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                Terms & Conditions
              </a>
              .
            </>
          }
        />
        <ConsentRow
          checked={acknowledgedPrivacy}
          onCheckedChange={onPrivacyChange}
          id="privacyAcknowledged"
          label={
            <>
              I acknowledge the{" "}
              <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </>
          }
        />
      </div>
    </div>
  );
}

function requiresPublishingDetails(status?: string) {
  return ["Signed to publisher", "Co-published"].includes(status ?? "");
}

function isSimplePublishingSetup(status?: string) {
  return status === "Self-published";
}

function validateAccountPage(
  page: number,
  profile: UserProfile,
  password: string,
  confirmPassword: string,
  acceptedTerms: boolean,
  acknowledgedPrivacy: boolean,
) {
  if (page === 0) {
    if (normalizeUsername(profile.username).length < 3) return "Choose a username with at least 3 letters or numbers.";
    if (!isValidEmailAddress(profile.emailAddress)) return "Enter a valid email address.";
    if (!profile.legalName.trim()) return "Enter your legal name.";
    if (!profile.phoneNumber.trim()) return "Enter your phone number.";
  }

  if (page === 1) {
    if (parseRoleTags(profile.roleTags).length === 0) return "Select at least one creator role.";
  }

  if (page === 2) {
    if (password.length < 8) return "Use at least 8 characters for your password.";
    if (password !== confirmPassword) return "The passwords do not match.";
    if (!acceptedTerms) return "Accept the Terms & Conditions to create your SPLIT account.";
    if (!acknowledgedPrivacy) return "Acknowledge the Privacy Policy to create your SPLIT account.";
  }

  return "";
}

function prepareProfileForRegistration(profile: UserProfile): UserProfile {
  const now = new Date().toISOString();
  const publishingStatus = (profile.publishingStatus ?? "").trim();
  const needsPublishingDetails = requiresPublishingDetails(publishingStatus);
  const skippedPro = profile.proAffiliation === "Skip PRO Registration";

  return normalizeUserProfile({
    ...profile,
    username: normalizeUsername(profile.username),
    emailAddress: normalizeEmailAddress(profile.emailAddress),
    displayName: (profile.displayName || profile.pkaNames || profile.username || profile.legalName).trim(),
    legalName: profile.legalName.trim(),
    pkaNames: (profile.pkaNames ?? "").trim(),
    roleTags: parseRoleTags(profile.roleTags)
      .filter((role) => !["Manager", "Publisher"].includes(role))
      .join(", "),
    phoneNumber: formatNationalPhoneNumber(profile.phoneNumber ?? "", profile.phoneCountryCode),
    proAffiliation: skippedPro ? "Skip PRO Registration" : (profile.proAffiliation ?? "").trim(),
    ipiNumber: skippedPro ? "" : (profile.ipiNumber ?? "").trim(),
    customProName: !skippedPro && profile.proAffiliation === "Other" ? (profile.customProName ?? "").trim() : "",
    publishingStatus,
    publisherName: needsPublishingDetails ? (profile.publisherName ?? "").trim() : "",
    publisherIpi: needsPublishingDetails ? (profile.publisherIpi ?? "").trim() : "",
    publisherPro: needsPublishingDetails ? (profile.publisherPro ?? "").trim() : "",
    publishingShare: isSimplePublishingSetup(publishingStatus) ? "100" : (profile.publishingShare ?? "").trim(),
    adminCompanyName: "",
    adminIpi: "",
    adminCollectionShare: "",
    publisherContact: needsPublishingDetails ? (profile.publisherContact ?? "").trim() : "",
    termsAcceptedAt: now,
    termsVersion: TERMS_VERSION,
    privacyAcknowledgedAt: now,
    privacyPolicyVersion: PRIVACY_VERSION,
  });
}

function parseRoleTags(value: string) {
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function FeedbackMessage({ error, notice }: { error: string; notice: string }) {
  if (!error && !notice) return null;

  return (
    <div className={`mt-5 rounded-lg border px-3 py-2 text-xs leading-5 ${
      error
        ? "border-destructive/20 bg-destructive/5 text-destructive"
        : "border-primary/20 bg-primary/5 text-primary"
    }`}>
      {error || notice}
    </div>
  );
}

function ConsentRow({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="cursor-pointer text-sm leading-6 text-muted-foreground">
        {label}
      </Label>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  required,
  help,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
          {label}
          {required ? <span className="text-primary"> *</span> : null}
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

function hasRecoveryUrl() {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
}
