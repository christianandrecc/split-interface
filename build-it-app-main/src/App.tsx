import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AccountAccess from "@/components/AccountAccess";
import { normalizeUserProfile, type UserProfile } from "@/lib/userProfile";
import {
  createSupabaseAccountProfile,
  loadProfileForActiveSession,
  normalizeEmailAddress,
  saveSupabaseProfile,
  signInAndLoadSupabaseProfile,
} from "@/lib/profileStorage";
import { toast } from "sonner";

const queryClient = new QueryClient();
const PROFILE_STORAGE_KEY = "split.userProfile.v6";

function hasRicherProfileData(profile: UserProfile | null) {
  if (!profile) return false;

  return Boolean(
    profile.legalName ||
      profile.legalFirstName ||
      profile.legalLastName ||
      profile.phoneNumber ||
      profile.roleTags ||
      profile.proAffiliation ||
      profile.ipiNumber ||
      profile.addressLine ||
      profile.city ||
      profile.publisherName ||
      profile.publishingStatus,
  );
}

function hasPasswordRecoveryUrl() {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
}

const App = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(() => hasPasswordRecoveryUrl());

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);

      if (savedProfile) {
        const normalizedProfile = normalizeUserProfile(JSON.parse(savedProfile));
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
        if (active) setUserProfile(normalizedProfile);
      }

      try {
        const supabaseProfile = await loadProfileForActiveSession();

        if (supabaseProfile && active) {
          window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(supabaseProfile));
          setUserProfile(supabaseProfile);
        }
      } catch {
        // Keep local beta state available if Supabase is not ready yet.
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const persistProfile = (profile: UserProfile) => {
    const normalizedProfile = normalizeUserProfile(profile);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
    setUserProfile(normalizedProfile);
    return normalizedProfile;
  };

  const handleCreateAccount = async (profile: UserProfile, password: string) => {
    const normalizedProfile = normalizeUserProfile(profile);
    const result = await createSupabaseAccountProfile(normalizedProfile, password);

    if (result.needsEmailConfirmation) {
      persistProfile(result.profile);
      throw new Error("Supabase created the account, but email confirmation is required. Confirm the email, then sign in here so SPLIT can finish saving the protected profile details.");
    }

    persistProfile(result.profile);
    setShowAccountCreation(false);
    toast.success("Account stored in Supabase", {
      description: result.profile.username ? `@${result.profile.username}` : result.profile.emailAddress,
    });
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    const normalizedProfile = persistProfile(profile);

    try {
      const savedProfile = await saveSupabaseProfile(normalizedProfile);
      persistProfile(savedProfile);
      toast.success("Profile saved to Supabase");
    } catch (error) {
      toast.error("Saved locally, but Supabase did not update", {
        description: error instanceof Error ? error.message : "Try again after signing in.",
      });
      throw error;
    }
  };

  const handleSignIn = async (emailAddress: string, password: string) => {
    const pendingProfile =
      userProfile && normalizeEmailAddress(userProfile.emailAddress) === normalizeEmailAddress(emailAddress)
        ? userProfile
        : null;
    const result = await signInAndLoadSupabaseProfile(emailAddress, password);
    const profile =
      hasRicherProfileData(pendingProfile)
        ? await saveSupabaseProfile({
            ...result.profile,
            ...pendingProfile,
            splitId: result.profile.splitId || pendingProfile.splitId,
            username: pendingProfile.username || result.profile.username,
            emailAddress: result.profile.emailAddress || pendingProfile.emailAddress,
          })
        : result.profile;

    persistProfile(profile);
    setShowAccountCreation(false);
    setPasswordRecoveryActive(false);
    toast.success("Signed in to SPLIT", {
      description: profile.username ? `@${profile.username}` : profile.emailAddress,
    });
  };

  const handlePasswordResetComplete = () => {
    setPasswordRecoveryActive(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (loadingProfile) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm font-semibold shadow-sm">
              Loading SPLIT account…
            </div>
          </main>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {userProfile && !showAccountCreation && !passwordRecoveryActive ? (
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Index
                    userProfile={userProfile}
                    onUpdateProfile={handleUpdateProfile}
                    onOpenAccountCreation={() => setShowAccountCreation(true)}
                  />
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        ) : (
          <AccountAccess
            initialProfile={userProfile}
            forcePasswordReset={passwordRecoveryActive}
            onCreateAccount={handleCreateAccount}
            onSignIn={handleSignIn}
            onPasswordResetComplete={handlePasswordResetComplete}
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
