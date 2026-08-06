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
  saveSupabaseProfile,
  signInAndLoadSupabaseProfile,
} from "@/lib/profileStorage";
import { toast } from "sonner";

const queryClient = new QueryClient();
const PROFILE_STORAGE_KEY = "split.userProfile.v6";

const App = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

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
      throw new Error("Supabase created the auth user, but email confirmation is required. Confirm the email, then use Sign In to finish saving the profile.");
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
    const result = await signInAndLoadSupabaseProfile(emailAddress, password);

    persistProfile(result.profile);
    setShowAccountCreation(false);
    toast.success("Signed in to SPLIT", {
      description: result.profile.username ? `@${result.profile.username}` : result.profile.emailAddress,
    });
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
        {userProfile && !showAccountCreation ? (
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
            onCreateAccount={handleCreateAccount}
            onSignIn={handleSignIn}
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
