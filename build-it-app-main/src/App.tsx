import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AccountAccess, { UserProfile, normalizeUserProfile } from "@/components/AccountAccess";

const queryClient = new QueryClient();
const PROFILE_STORAGE_KEY = "split.userProfile.v5";

const App = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAccountCreation, setShowAccountCreation] = useState(false);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);

    if (savedProfile) {
      const normalizedProfile = normalizeUserProfile(JSON.parse(savedProfile));
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
      setUserProfile(normalizedProfile);
    }
  }, []);

  const handleCreateAccount = (profile: UserProfile) => {
    const normalizedProfile = normalizeUserProfile(profile);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
    setUserProfile(normalizedProfile);
    setShowAccountCreation(false);
  };

  const handleUpdateProfile = (profile: UserProfile) => {
    const normalizedProfile = normalizeUserProfile(profile);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
    setUserProfile(normalizedProfile);
  };

  const handleSignIn = (emailAddress: string) => {
    const fallbackName = emailAddress.split("@")[0];
    const profile = normalizeUserProfile({
      username: fallbackName,
      displayName: fallbackName,
      profileImageUrl: "",
      roleTags: "",
      socialInstagram: "",
      socialTikTok: "",
      socialX: "",
      socialWebsite: "",
      profileLocation: "",
      profileVisibility: "Collaborators only",
      legalName: fallbackName,
      legalFirstName: fallbackName,
      legalMiddleName: "",
      legalLastName: "",
      pkaNames: "",
      phoneCountryCode: "+1",
      phoneNumber: "",
      emailAddress,
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
    });

    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setUserProfile(profile);
    setShowAccountCreation(false);
  };

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
