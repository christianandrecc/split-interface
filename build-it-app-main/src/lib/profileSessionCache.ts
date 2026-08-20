import { normalizeEmailAddress } from "@/lib/profileStorage";
import type { UserProfile } from "@/lib/userProfile";

export type CachedProfileSession = {
  userId: string;
  profile: UserProfile;
};

export function profileSessionMatchesSignIn(
  cachedSession: CachedProfileSession | null,
  resultUserId?: string | null,
  emailAddress?: string | null,
) {
  return Boolean(
    cachedSession?.userId &&
      resultUserId &&
      cachedSession.userId === resultUserId &&
      normalizeEmailAddress(cachedSession.profile.emailAddress) === normalizeEmailAddress(emailAddress),
  );
}
