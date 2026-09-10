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
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
      >
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold">Your Profile</span>
      </button>
      <button
        onClick={onOpenAccountCreation}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
      >
        <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-sidebar-foreground">
          <UserPlus className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold">Account Setup</span>
      </button>
    </div>
  );
}
