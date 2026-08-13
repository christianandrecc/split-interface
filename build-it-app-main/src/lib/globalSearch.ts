import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export type SearchableSplitSheet = {
  id: string;
  title: string;
  status: string;
  updated: string;
  parties: string[];
  splits: { name: string; role: string; percent: number }[];
};

export type SplitSheetSearchResult = {
  type: "split-sheet";
  id: string;
  title: string;
  status: string;
  updated: string;
  description: string;
};

export type PublicProfileSearchResult = {
  type: "profile";
  userId: string;
  username: string;
  displayName: string;
  roleTags: string;
  profileImageUrl: string;
  profileLocation: string;
};

type PublicProfileSearchRow = {
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  role_tags: string | null;
  profile_image_url: string | null;
  profile_location: string | null;
};

function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function searchSplitSheets(
  splitSheets: SearchableSplitSheet[],
  query: string,
  limit = 5,
): SplitSheetSearchResult[] {
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return splitSheets
    .map((sheet) => {
      const collaboratorText = sheet.parties.join(" ");
      const splitText = sheet.splits
        .map((split) => `${split.name} ${split.role} ${split.percent}`)
        .join(" ");
      const searchable = [
        sheet.title,
        sheet.status,
        sheet.updated,
        collaboratorText,
        splitText,
      ]
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(normalizedQuery)) {
        return null;
      }

      return {
        type: "split-sheet" as const,
        id: sheet.id,
        title: sheet.title,
        status: sheet.status,
        updated: sheet.updated,
        description: sheet.parties.length > 0
          ? sheet.parties.slice(0, 3).join(", ")
          : "Split sheet",
      };
    })
    .filter((result): result is SplitSheetSearchResult => Boolean(result))
    .slice(0, limit);
}

function mapPublicProfileSearchRow(row: PublicProfileSearchRow): PublicProfileSearchResult | null {
  const username = cleanText(row.username);
  const displayName = cleanText(row.display_name) || username || "SPLIT user";
  const userId = cleanText(row.user_id);

  if (!userId && !username) {
    return null;
  }

  return {
    type: "profile",
    userId,
    username,
    displayName,
    roleTags: cleanText(row.role_tags),
    profileImageUrl: cleanText(row.profile_image_url),
    profileLocation: cleanText(row.profile_location),
  };
}

export async function searchPublicProfiles(query: string, limit = 8): Promise<PublicProfileSearchResult[]> {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!isSupabaseConfigured || normalizedQuery.length < 2) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc("search_split_profiles", {
      search_query: normalizedQuery,
      result_limit: limit,
    });

    if (error) {
      console.warn("[SPLIT] Unable to search profiles from Supabase", error);
      return [];
    }

    return ((data ?? []) as PublicProfileSearchRow[])
      .map(mapPublicProfileSearchRow)
      .filter((result): result is PublicProfileSearchResult => Boolean(result));
  } catch (error) {
    console.warn("[SPLIT] Unable to search profiles from Supabase", error);
    return [];
  }
}

export const mapPublicProfileSearchRowForTest = mapPublicProfileSearchRow;
