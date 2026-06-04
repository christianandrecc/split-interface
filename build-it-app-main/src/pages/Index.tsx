import Dashboard from "@/components/Dashboard";
import { UserProfile } from "@/components/AccountAccess";

const Index = ({
  userProfile,
  onUpdateProfile,
  onOpenAccountCreation,
}: {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
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
