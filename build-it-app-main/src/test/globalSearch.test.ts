import { describe, expect, it } from "vitest";
import {
  mapPublicProfileSearchRowForTest,
  searchSplitSheets,
} from "@/lib/globalSearch";

describe("global search", () => {
  it("finds split sheets by title, collaborator, status, and role", () => {
    const splitSheets = [
      {
        id: "split-1",
        title: "Night Swim",
        status: "Pending Signatures",
        updated: "2026-08-13",
        parties: ["Chori", "Elena Shore"],
        splits: [
          { name: "Chori", role: "Producer", percent: 50 },
          { name: "Elena Shore", role: "Writer", percent: 50 },
        ],
      },
      {
        id: "split-2",
        title: "After Hours",
        status: "Draft",
        updated: "2026-08-12",
        parties: ["Maya Rios"],
        splits: [{ name: "Maya Rios", role: "Vocalist", percent: 100 }],
      },
    ];

    expect(searchSplitSheets(splitSheets, "elena")).toEqual([
      expect.objectContaining({ id: "split-1", title: "Night Swim" }),
    ]);
    expect(searchSplitSheets(splitSheets, "draft")).toEqual([
      expect.objectContaining({ id: "split-2", title: "After Hours" }),
    ]);
    expect(searchSplitSheets(splitSheets, "vocalist")).toEqual([
      expect.objectContaining({ id: "split-2", title: "After Hours" }),
    ]);
  });

  it("does not show one-character searches", () => {
    expect(searchSplitSheets([], "a")).toEqual([]);
  });

  it("maps public profile search rows without private account fields", () => {
    const result = mapPublicProfileSearchRowForTest({
      user_id: "00000000-0000-0000-0000-000000000000",
      username: "mayarios",
      display_name: "Maya Rios",
      role_tags: "Producer, Songwriter",
      profile_image_url: "https://example.com/maya.jpg",
      profile_location: "New York, NY",
    });

    expect(result).toEqual({
      type: "profile",
      userId: "00000000-0000-0000-0000-000000000000",
      username: "mayarios",
      displayName: "Maya Rios",
      roleTags: "Producer, Songwriter",
      profileImageUrl: "https://example.com/maya.jpg",
      profileLocation: "New York, NY",
    });
  });
});
