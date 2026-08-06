import Dashboard from "@/components/Dashboard";
import type { UserProfile } from "@/lib/userProfile";

const Index = ({
  userProfile,
  onUpdateProfile,
  onOpenAccountCreation,
}: {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onOpenAccountCreation: () => void;
}) => {
  return (
    <Dashboard
      userProfile={userProfile}
      onUpdateProfile={onUpdateProfile}
      onOpenAccountCreation={onOpenAccountCreation}
    />
  );
};

export default Index;
