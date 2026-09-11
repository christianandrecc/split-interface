import { describe, expect, it } from "vitest";
import { filterLibrary, INITIAL_LIBRARY_VIEW, libraryUpdatedAt, matchesLibraryFilter } from "@/lib/splitLibrary";
import { documentToAgreement, type Agreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";

function agreement(status: Agreement["status"] = "Draft") {
  return { ...documentToAgreement(makeDocument()), status };
}

describe("split library", () => {
  it("groups every workflow state without hiding archived or finalized records", () => {
    const records = ["Draft", "Pending Collaborator Acceptance", "Pending Split Approval", "Ready to Sign",
      "Pending Signatures", "Disputed", "Revision Requested", "Amended", "Fully Signed", "Verified and Stored", "Executed", "Archived"]
      .map((status) => agreement(status as Agreement["status"]));
    expect(records.filter((record) => matchesLibraryFilter(record, "All"))).toHaveLength(12);
    expect(records.filter((record) => matchesLibraryFilter(record, "Pending"))).toHaveLength(7);
    expect(records.filter((record) => matchesLibraryFilter(record, "Verified"))).toHaveLength(3);
    expect(records.filter((record) => matchesLibraryFilter(record, "Draft"))).toHaveLength(1);
    expect(records.filter((record) => matchesLibraryFilter(record, "Archived"))).toHaveLength(1);
  });

  it("searches work, artist, collaborators, usernames, and record IDs with accent-insensitive terms", () => {
    const record = agreement();
    record.title = "El Balcón";
    for (const query of ["BALCON chori", "@mayarios", "SPLIT-20260812", record.id, "maya balcon"]) {
      expect(filterLibrary([record], { ...INITIAL_LIBRARY_VIEW, query })).toEqual([record]);
    }
    expect(filterLibrary([record], { ...INITIAL_LIBRARY_VIEW, query: "balcon unknown" })).toEqual([]);
    expect(filterLibrary([record], { ...INITIAL_LIBRARY_VIEW, query: "balcon", filter: "Verified" })).toEqual([]);
  });

  it("sorts by the actual update timestamp and keeps source records in their original order", () => {
    const earlier = agreement();
    const later = agreement();
    earlier.id = "earlier";
    later.id = "later";
    earlier.document!.updatedAt = "2026-09-11T09:00:00Z";
    later.document!.updatedAt = "2026-09-11T15:00:00Z";
    const source = [earlier, later];
    expect(libraryUpdatedAt(later)).toBe("2026-09-11T15:00:00Z");
    expect(filterLibrary(source, INITIAL_LIBRARY_VIEW).map((record) => record.id)).toEqual(["later", "earlier"]);
    expect(filterLibrary(source, { ...INITIAL_LIBRARY_VIEW, sort: "oldest" }).map((record) => record.id)).toEqual(["earlier", "later"]);
    expect(source).toEqual([earlier, later]);
  });

  it("sorts numbered titles naturally and handles missing documents or invalid dates", () => {
    const records = ["Song 10", "Song 2"].map((title) => ({ ...agreement(), id: title, title, document: undefined, updated: "invalid" }));
    expect(filterLibrary(records, { ...INITIAL_LIBRARY_VIEW, sort: "title" }).map((record) => record.title)).toEqual(["Song 2", "Song 10"]);
    expect(filterLibrary(records, INITIAL_LIBRARY_VIEW).map((record) => record.title)).toEqual(["Song 2", "Song 10"]);
  });
});
