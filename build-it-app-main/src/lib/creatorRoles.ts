export const CREATOR_ROLE_OPTIONS = ["Producer", "Writer", "Artist", "Engineer", "Topliner"];

export function parseCreatorRoleTags(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

export function getPrimaryCreatorRole(value?: string | null) {
  return parseCreatorRoleTags(value).find((role) => CREATOR_ROLE_OPTIONS.includes(role)) ?? CREATOR_ROLE_OPTIONS[0];
}
