import Dashboard from "@/components/Dashboard";
import type { UserProfile } from "@/lib/userProfile";

const Index = ({
  userProfile,
  activeAuthUserId,
  onUpdateProfile,
  onOpenAccountCreation,
}: {
  userProfile: UserProfile;
  activeAuthUserId?: string | null;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onOpenAccountCreation: () => void;
}) => {
  return (
    <Dashboard
      userProfile={userProfile}
      activeAuthUserId={activeAuthUserId}
      onUpdateProfile={onUpdateProfile}
      onOpenAccountCreation={onOpenAccountCreation}
    />
  );
};

export default Index;
