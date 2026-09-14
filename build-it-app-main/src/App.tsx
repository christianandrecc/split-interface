import { useCallback, useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AccountAccess from "@/components/AccountAccess";
import NewUserOnboarding from "@/components/NewUserOnboarding";
import { normalizeUserProfile, type UserProfile } from "@/lib/userProfile";
import {
  createSupabaseAccountProfile,
  loadProfileSessionForActiveSession,
  normalizeEmailAddress,
  saveSupabaseProfile,
  signInAndLoadSupabaseProfile,
} from "@/lib/profileStorage";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { CachedProfileSession } from "@/lib/profileSessionCache";
import { toast } from "sonner";
import { monitorRequest } from "@/lib/monitoring";

const queryClient = new QueryClient();
const PROFILE_STORAGE_KEY = "split.userProfile.v6";
const PROFILE_SESSION_STORAGE_KEY = "split.userProfileSession.v1";
const NEW_USER_ONBOARDING_STORAGE_PREFIX = "split.newUserOnboarding.v1";

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

function getNewUserOnboardingStorageKey(authUserId: string | null, profile: UserProfile | null) {
  if (!profile) return "";
  const profileIdentity = authUserId || profile.authUserId || profile.emailAddress || profile.username || "local-profile";
  return `${NEW_USER_ONBOARDING_STORAGE_PREFIX}:${profileIdentity}`;
}

const App = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeAuthUserId, setActiveAuthUserId] = useState<string | null>(null);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [showNewUserOnboarding, setShowNewUserOnboarding] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOutPending = useRef(false);
  const recoveryUserId = useRef<string | null>(null);
  const authIdentity = useRef<{ userId: string | null | undefined; revision: number }>({ userId: undefined, revision: 0 });
  const [sessionRequest, setSessionRequest] = useState(authIdentity.current);

  const invalidateSession = useCallback((userId: string | null) => {
    const next = { userId, revision: authIdentity.current.revision + 1 };
    authIdentity.current = next;
    recoveryUserId.current = null;
    clearProfileCache();
    queryClient.clear();
    setActiveAuthUserId(null);
    setUserProfile(null);
    setShowAccountCreation(false);
    setShowNewUserOnboarding(false);
    setPasswordRecoveryActive(false);
    setLoadingProfile(userId !== null);
    setSessionRequest(next);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    // Keep this callback synchronous: profile fetching runs in the load effect.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        invalidateSession(null);
        return;
      }
      if (!["SIGNED_IN", "TOKEN_REFRESHED", "PASSWORD_RECOVERY"].includes(event) || !session?.user) return;
      if (authIdentity.current.userId === undefined) {
        // Initial callback consumption must finish before deciding recovery mode.
        authIdentity.current = { ...authIdentity.current, userId: session.user.id };
      } else if (authIdentity.current.userId !== session.user.id) {
        invalidateSession(session.user.id);
      }
      if (event === "PASSWORD_RECOVERY") {
        recoveryUserId.current = session.user.id;
        setPasswordRecoveryActive(true);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [invalidateSession]);

  useEffect(() => {
    let active = true;
    const revision = sessionRequest.revision;
    if (isSupabaseConfigured && sessionRequest.userId === null) return;

    async function loadProfile() {
      if (isSupabaseConfigured) {
        try {
          const session = await loadProfileSessionForActiveSession();

          if (!active || authIdentity.current.revision !== revision) return;
          const expectedUserId = authIdentity.current.userId;
          if (expectedUserId && session?.userId !== expectedUserId) {
            if (sessionRequest.userId === undefined && session) invalidateSession(expectedUserId);
            else invalidateSession(null);
            return;
          }
          authIdentity.current = { ...authIdentity.current, userId: session?.userId ?? null };
          setPasswordRecoveryActive(Boolean(session && (session.passwordRecovery || recoveryUserId.current === session.userId)));

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
        } catch (error) {
          if (active && authIdentity.current.revision === revision) {
            authIdentity.current = { ...authIdentity.current, userId: null };
            recoveryUserId.current = null;
            setPasswordRecoveryActive(false);
            setActiveAuthUserId(null);
            clearProfileCache();
            setUserProfile(null);
            toast.error("Could not restore sign-in", {
              description: error instanceof Error ? error.message : "Please sign in again.",
            });
          }
        } finally {
          if (active && authIdentity.current.revision === revision) setLoadingProfile(false);
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
  }, [sessionRequest, invalidateSession]);

  useEffect(() => {
    if (!isSupabaseConfigured || !activeAuthUserId) return;
    let active = true;
    let request = 0;
    let timer: ReturnType<typeof setTimeout>;
    const refreshEmail = async () => {
      const generation = ++request;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active || generation !== request) return;
        if (error) {
          if (error.name === "AuthSessionMissingError") invalidateSession(null);
          return;
        }
        if (data.user?.id !== activeAuthUserId) {
          invalidateSession(data.user?.id ?? null);
          return;
        }
        const emailAddress = normalizeEmailAddress(data.user.email);
        setUserProfile(current => {
          if (!current || current.authUserId !== activeAuthUserId || current.emailAddress === emailAddress) return current;
          const profile = { ...current, emailAddress };
          writeProfileSession(activeAuthUserId, profile);
          return profile;
        });
      } catch { /* A transient refresh failure must not replace the saved profile. */ }
    };
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (["USER_UPDATED", "SIGNED_IN", "TOKEN_REFRESHED"].includes(event)) {
        clearTimeout(timer);
        timer = setTimeout(() => void refreshEmail(), 0);
      }
    });
    window.addEventListener("focus", refreshEmail);
    return () => {
      active = false;
      clearTimeout(timer);
      data.subscription.unsubscribe();
      window.removeEventListener("focus", refreshEmail);
    };
  }, [activeAuthUserId, invalidateSession]);

  useEffect(() => {
    if (!userProfile || showAccountCreation || passwordRecoveryActive) {
      setShowNewUserOnboarding(false);
      return;
    }

    const onboardingStorageKey = getNewUserOnboardingStorageKey(activeAuthUserId, userProfile);

    try {
      setShowNewUserOnboarding(window.localStorage.getItem(onboardingStorageKey) !== "complete");
    } catch {
      setShowNewUserOnboarding(false);
    }
  }, [activeAuthUserId, passwordRecoveryActive, showAccountCreation, userProfile]);

  const persistProfile = (profile: UserProfile, authUserId = activeAuthUserId) => {
    authIdentity.current = { ...authIdentity.current, userId: authUserId };
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
    const revision = authIdentity.current.revision;
    const normalizedProfile = normalizeUserProfile(profile);
    const result = await createSupabaseAccountProfile(normalizedProfile, password);
    if (authIdentity.current.revision !== revision && authIdentity.current.userId !== result.userId) {
      throw new Error("Your account changed. Please try again from the current account.");
    }

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
    const revision = authIdentity.current.revision;
    const normalizedProfile = normalizeUserProfile(profile);

    try {
      const savedProfile = await saveSupabaseProfile(normalizedProfile);
      if (authIdentity.current.revision !== revision || authIdentity.current.userId !== activeAuthUserId) {
        throw new Error("Your account changed. Reopen your profile before making another change.");
      }
      persistProfile(savedProfile, activeAuthUserId);
      toast.success("Profile saved to Supabase");
    } catch (error) {
      if (authIdentity.current.revision === revision) {
        toast.error("Profile was not saved", {
          description: error instanceof Error ? error.message : "Try again after signing in.",
        });
      }
      throw error;
    }
  };

  const handleSignIn = async (emailAddress: string, password: string) => {
    const revision = authIdentity.current.revision;
    const result = await signInAndLoadSupabaseProfile(emailAddress, password);
    if (authIdentity.current.revision !== revision && authIdentity.current.userId !== result.userId) {
      throw new Error("Your account changed. Please sign in again.");
    }
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
    recoveryUserId.current = null;
    setPasswordRecoveryActive(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const handleSignOut = async () => {
    if (signOutPending.current) return;
    signOutPending.current = true;
    setSigningOut(true);
    const revision = authIdentity.current.revision;
    try {
      if (isSupabaseConfigured) {
        const { error } = await monitorRequest("auth_signout_failure", () => supabase.auth.signOut({ scope: "local" }));
        if (error) throw error;
      }
      // SIGNED_OUT normally invalidates first; never clear a newer account here.
      if (authIdentity.current.revision === revision) invalidateSession(null);
    } catch {
      if (authIdentity.current.revision === revision) {
        toast.error("Could not sign out", { description: "Check your connection and try again." });
      } else if (authIdentity.current.userId === null && authIdentity.current.revision === revision + 1) {
        toast.warning("Signed out on this browser", { description: "Your local session was cleared, but SPLIT could not confirm server sign-out." });
      }
    } finally {
      signOutPending.current = false;
      setSigningOut(false);
    }
  };

  const completeNewUserOnboarding = () => {
    const onboardingStorageKey = getNewUserOnboardingStorageKey(activeAuthUserId, userProfile);

    try {
      if (onboardingStorageKey) {
        window.localStorage.setItem(onboardingStorageKey, "complete");
      }
    } catch {
      // Ignore disabled storage.
    }

    setShowNewUserOnboarding(false);
  };

  const viewNewUserOnboardingAgain = () => {
    const onboardingStorageKey = getNewUserOnboardingStorageKey(activeAuthUserId, userProfile);

    try {
      if (onboardingStorageKey) {
        window.localStorage.removeItem(onboardingStorageKey);
      }
    } catch {
      // Ignore disabled storage.
    }

    setShowAccountCreation(false);
    setPasswordRecoveryActive(false);
    setShowNewUserOnboarding(true);
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
        {userProfile && !showAccountCreation && !passwordRecoveryActive && showNewUserOnboarding ? (
          <NewUserOnboarding onComplete={completeNewUserOnboarding} />
        ) : userProfile && !showAccountCreation && !passwordRecoveryActive ? (
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Index
                    key={activeAuthUserId ?? "local"}
                    userProfile={userProfile}
                    activeAuthUserId={activeAuthUserId}
                    onUpdateProfile={handleUpdateProfile}
                    onOpenAccountCreation={() => setShowAccountCreation(true)}
                    onViewOnboardingAgain={viewNewUserOnboardingAgain}
                    onSignOut={handleSignOut}
                    signingOut={signingOut}
                  />
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        ) : (
          <AccountAccess
            key={sessionRequest.revision}
            initialProfile={userProfile}
            initialMode={sessionRequest.userId === null && !showAccountCreation ? "signin" : "create"}
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
