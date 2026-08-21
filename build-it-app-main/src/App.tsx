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
  loadProfileSessionForActiveSession,
  saveSupabaseProfile,
  signInAndLoadSupabaseProfile,
} from "@/lib/profileStorage";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import type { CachedProfileSession } from "@/lib/profileSessionCache";
import { toast } from "sonner";

const queryClient = new QueryClient();
const PROFILE_STORAGE_KEY = "split.userProfile.v6";
const PROFILE_SESSION_STORAGE_KEY = "split.userProfileSession.v1";

function readLocalProfile() {
  try {
    const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!savedProfile) return null;

    const normalizedProfile = normalizeUserProfile(JSON.parse(savedProfile));
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
    return normalizedProfile;
  } catch {
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // Ignore disabled storage.
    }
    return null;
  }
}

function writeLocalProfile(profile: UserProfile) {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore disabled storage.
  }
}

function writeProfileSession(userId: string, profile: UserProfile) {
  const cachedSession: CachedProfileSession = { userId, profile };
  try {
    window.localStorage.setItem(PROFILE_SESSION_STORAGE_KEY, JSON.stringify(cachedSession));
  } catch {
    // Ignore disabled storage.
  }
  writeLocalProfile(profile);
}

function clearProfileCache() {
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    window.localStorage.removeItem(PROFILE_SESSION_STORAGE_KEY);
  } catch {
    // Ignore disabled storage.
  }
}

function hasPasswordRecoveryUrl() {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
}

const App = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeAuthUserId, setActiveAuthUserId] = useState<string | null>(null);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(() => hasPasswordRecoveryUrl());

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (isSupabaseConfigured) {
        try {
          const session = await loadProfileSessionForActiveSession();

          if (!active) return;

          if (session) {
            const normalizedProfile = normalizeUserProfile({
              ...session.profile,
              authUserId: session.userId,
            });
            setActiveAuthUserId(session.userId);
            writeProfileSession(session.userId, normalizedProfile);
            setUserProfile(normalizedProfile);
          } else {
            setActiveAuthUserId(null);
            clearProfileCache();
            setUserProfile(null);
          }
        } catch {
          if (active) {
            setActiveAuthUserId(null);
            clearProfileCache();
            setUserProfile(null);
          }
        } finally {
          if (active) setLoadingProfile(false);
        }

        return;
      }

      const savedProfile = readLocalProfile();
      if (savedProfile && active) {
        setUserProfile(savedProfile);
      }

      if (active) {
        setActiveAuthUserId(null);
        setLoadingProfile(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const persistProfile = (profile: UserProfile, authUserId = activeAuthUserId) => {
    const normalizedProfile = normalizeUserProfile({
      ...profile,
      authUserId: authUserId ?? profile.authUserId,
    });
    if (authUserId) {
      writeProfileSession(authUserId, normalizedProfile);
    } else {
      writeLocalProfile(normalizedProfile);
    }
    setUserProfile(normalizedProfile);
    return normalizedProfile;
  };

  const handleCreateAccount = async (profile: UserProfile, password: string) => {
    const normalizedProfile = normalizeUserProfile(profile);
    const result = await createSupabaseAccountProfile(normalizedProfile, password);

    if (result.needsEmailConfirmation) {
      setActiveAuthUserId(null);
      clearProfileCache();
      setUserProfile(null);
      return {
        needsEmailConfirmation: true,
        emailAddress: result.profile.emailAddress || normalizedProfile.emailAddress,
      };
    }

    setActiveAuthUserId(result.userId ?? null);
    persistProfile(result.profile, result.userId ?? null);
    setShowAccountCreation(false);
    toast.success("Account stored in Supabase", {
      description: result.profile.username ? `@${result.profile.username}` : result.profile.emailAddress,
    });
    return { needsEmailConfirmation: false };
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    const normalizedProfile = persistProfile(profile);

    try {
      const savedProfile = await saveSupabaseProfile(normalizedProfile);
      persistProfile(savedProfile, activeAuthUserId);
      toast.success("Profile saved to Supabase");
    } catch (error) {
      toast.error("Saved locally, but Supabase did not update", {
        description: error instanceof Error ? error.message : "Try again after signing in.",
      });
      throw error;
    }
  };

  const handleSignIn = async (emailAddress: string, password: string) => {
    const result = await signInAndLoadSupabaseProfile(emailAddress, password);
    clearProfileCache();
    setActiveAuthUserId(result.userId ?? null);
    persistProfile(result.profile, result.userId ?? null);
    setShowAccountCreation(false);
    setPasswordRecoveryActive(false);
    toast.success("Signed in to SPLIT", {
      description: result.profile.username ? `@${result.profile.username}` : result.profile.emailAddress,
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
                    activeAuthUserId={activeAuthUserId}
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
