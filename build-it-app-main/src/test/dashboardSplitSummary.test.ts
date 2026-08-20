import { describe, expect, it } from "vitest";
import {
  buildDashboardSplitSummary,
  buildQuickAccessMoments,
  formatAgreementActivityTime,
} from "@/lib/dashboardSplitSummary";
import type { Agreement } from "@/lib/splitSheetAgreement";

function agreement(
  id: string,
  status: Agreement["status"],
  updated: string,
  parties = ["Chori", "Maya Rios"],
): Agreement {
  return {
    id,
    title: id,
    type: "Split Sheet",
    status,
    parties,
    version: 1,
    created: "2026-08-10T12:00:00.000Z",
    updated,
    splits: [],
  };
}

describe("dashboard split summary", () => {
  it("counts draft, pending, and verified split sheets from the shared workflow statuses", () => {
    const summary = buildDashboardSplitSummary([
      agreement("draft", "Draft", "2026-08-10T12:00:00.000Z"),
      agreement("review", "Pending Split Approval", "2026-08-11T12:00:00.000Z"),
      agreement("sign", "Ready to Sign", "2026-08-12T12:00:00.000Z"),
      agreement("dispute", "Disputed", "2026-08-13T12:00:00.000Z"),
      agreement("done", "Verified and Stored", "2026-08-14T12:00:00.000Z"),
    ]);

    expect(summary.drafts).toBe(1);
    expect(summary.pending).toBe(3);
    expect(summary.executed).toBe(1);
  });

  it("prioritizes active negotiation threads before passive recent records", () => {
    const moments = buildQuickAccessMoments(
      [
        agreement("verified record", "Verified and Stored", "2026-08-20T15:00:00.000Z"),
        agreement("review needed", "Pending Split Approval", "2026-08-19T15:00:00.000Z"),
        agreement("ready split", "Ready to Sign", "2026-08-18T15:00:00.000Z"),
      ],
      Date.parse("2026-08-20T16:00:00.000Z"),
    );

    expect(moments.primary).toMatchObject({
      title: "review needed",
      kind: "negotiation",
      action: "messages",
      label: "Continue negotiation",
    });
    expect(moments.primary?.detail).toContain("Maya Rios has a split proposal waiting");
    expect(moments.secondary.map((moment) => moment.kind)).toEqual(["signature", "verified"]);
  });

  it("returns an empty quick access state when the account has no split sheets", () => {
    expect(buildQuickAccessMoments([])).toEqual({ primary: null, secondary: [] });
  });

  it("formats dashboard activity age using a stable clock", () => {
    expect(
      formatAgreementActivityTime(
        agreement("recent", "Pending Split Approval", "2026-08-20T15:45:00.000Z"),
        Date.parse("2026-08-20T16:00:00.000Z"),
      ),
    ).toBe("15 min ago");
  });
});
