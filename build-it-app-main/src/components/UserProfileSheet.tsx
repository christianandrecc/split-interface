import { User, UserPlus } from "lucide-react";

export default function UserProfileSheet({
  onOpenProfile,
  onOpenAccountCreation,
}: {
  onOpenProfile: () => void;
  onOpenAccountCreation: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <button
        onClick={onOpenProfile}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium">Your Profile</span>
      </button>
      <button
        onClick={onOpenAccountCreation}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <UserPlus className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium">Account Setup</span>
      </button>
    </div>
  );
}
