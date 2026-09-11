import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgreementDetail from "@/components/AgreementDetail";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";

describe("collaborator registration preview", () => {
  it("shows each party's stored PRO and IPI, not the viewer's current profile", () => {
    const doc = makeDocument();
    Object.assign(doc.data.parties[0], { proAffiliation: "ASCAP", ipiNumber: "00123456789" });
    Object.assign(doc.data.parties[1], { proAffiliation: "Other", customProName: "Independent Writers Society", ipiNumber: "00012345678" });
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={{ ...doc.creatorProfile, proAffiliation: "Unrelated current PRO", ipiNumber: "99999999999" }} />);
    fireEvent.click(screen.getByRole("button", { name: /^Registration/ }));
    const table = screen.getByRole("table", { name: "Collaborator registration" });
    expect(within(table).getByRole("row", { name: /Chori/ })).toHaveTextContent("ASCAP");
    expect(within(table).getByRole("row", { name: /Chori/ })).toHaveTextContent("00123456789");
    expect(within(table).getByRole("row", { name: /Maya Rios/ })).toHaveTextContent("Independent Writers Society");
    expect(within(table).getByRole("row", { name: /Maya Rios/ })).toHaveTextContent("00012345678");
    expect(table).not.toHaveTextContent("99999999999");
    expect(table).not.toHaveTextContent("Unrelated current PRO");
  });

  it("labels missing fields without inventing registration details", () => {
    const doc = makeDocument();
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} />);
    fireEvent.click(screen.getByRole("button", { name: /^Registration/ }));
    const table = screen.getByRole("table", { name: "Collaborator registration" });
    expect(within(table).getAllByText("Not provided")).toHaveLength(4);
  });
});
