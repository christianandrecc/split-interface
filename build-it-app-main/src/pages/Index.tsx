import Dashboard from "@/components/Dashboard";
import type { UserProfile } from "@/lib/userProfile";

const Index = ({
  userProfile,
  activeAuthUserId,
  onUpdateProfile,
  onOpenAccountCreation,
  onViewOnboardingAgain,
  onSignOut,
  signingOut,
}: {
  userProfile: UserProfile;
  activeAuthUserId?: string | null;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onOpenAccountCreation: () => void;
  onViewOnboardingAgain?: () => void;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}) => {
  return (
    <Dashboard
      userProfile={userProfile}
      activeAuthUserId={activeAuthUserId}
      onUpdateProfile={onUpdateProfile}
      onOpenAccountCreation={onOpenAccountCreation}
      onViewOnboardingAgain={onViewOnboardingAgain}
      onSignOut={onSignOut}
      signingOut={signingOut}
    />
  );
};

export default Index;
