import type { CreatorProfile } from "@/types/creatorProfile";
import type { UserProfile } from "@/lib/userProfile";

const EMPTY_PROFILE: CreatorProfile = {
  id: "current-user", displayName: "", username: "", verified: false,
  profileImage: "", roles: [], bio: "", location: "", verifiedCredits: 0,
  socials: {}, credits: [], spotlight: [],
};

export function mergeCreatorProfile(base: CreatorProfile = EMPTY_PROFILE, user?: UserProfile): CreatorProfile {
  if (!user) return base;
  return {
    ...base,
    id: user.authUserId || user.username || base.id,
    // Only explicitly public identity fields belong on a creator profile.
    displayName: user.displayName.trim() || user.pkaNames.split(",")[0].trim() || user.username || base.displayName,
    username: user.username || base.username,
    profileImage: user.profileImageUrl || base.profileImage,
    roles: [...new Set(user.roleTags.split(",").map(role => role.trim()).filter(Boolean))],
    location: user.profileLocation || base.location,
    socials: { instagram: user.socialInstagram, tiktok: user.socialTikTok, x: user.socialX },
  };
}

export type CreatorSocialLink = { platform: string; url: string };

export function creatorSocialLinks(socials: CreatorProfile["socials"]): CreatorSocialLink[] {
  const platforms = [
    { platform: "Instagram", value: socials.instagram, host: "instagram.com", hosts: ["instagram.com"], prefix: "", handle: /^[a-zA-Z0-9_.]+$/ },
    { platform: "TikTok", value: socials.tiktok, host: "tiktok.com", hosts: ["tiktok.com"], prefix: "@", handle: /^[a-zA-Z0-9_.]+$/ },
    { platform: "X / Twitter", value: socials.x, host: "x.com", hosts: ["x.com", "twitter.com"], prefix: "", handle: /^[a-zA-Z0-9_]+$/ },
  ];
  return platforms.flatMap(({ platform, value, host, hosts, prefix, handle }) => {
    const raw = value?.trim();
    if (!raw) return [];
    const name = raw.replace(/^@/, "");
    if (handle.test(name) && !hosts.includes(name.toLowerCase())) return [{ platform, url: `https://${host}/${prefix}${name}` }];
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!hosts.includes(url.hostname.replace(/^www\./, "")) || url.username || url.password || url.port || url.pathname === "/") return [];
      url.protocol = "https:";
      url.search = "";
      url.hash = "";
      return [{ platform, url: url.toString() }];
    } catch {
      return [];
    }
  });
}
