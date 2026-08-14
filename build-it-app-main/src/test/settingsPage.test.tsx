import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SettingsPage from "@/components/SettingsPage";
import { CREATOR_ROLE_OPTIONS } from "@/lib/creatorRoles";
import { createEmptyProfile } from "@/lib/userProfile";

describe("SettingsPage", () => {
  it("uses the first signup role as the default role and matches signup role options", () => {
    render(
      <SettingsPage
        userProfile={{
          ...createEmptyProfile(),
          roleTags: "Engineer, Producer",
        }}
      />,
    );

    const defaultRoleSelect = screen.getAllByRole("combobox")[2];
    expect(defaultRoleSelect).toHaveTextContent("Engineer");
    expect(CREATOR_ROLE_OPTIONS).toEqual(["Producer", "Writer", "Artist", "Engineer", "Topliner"]);
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Songwriter");
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Composer");
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Lyricist");
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Contributor");
  });
});
