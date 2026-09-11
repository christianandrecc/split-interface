import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgreementDetail from "@/components/AgreementDetail";
import { makeDocument } from "@/test/fixtures/splitSheet";
import { documentToAgreement } from "@/lib/splitSheetAgreement";

describe("draft record preview", () => {
  it("shows saved draft shares and unsent states without implying approval or signatures", () => {
    const document = makeDocument();
    document.status = "Draft";
    document.data.parties[0].percent = 70;
    document.data.parties[1].percent = 30;
    const onEditDraft = vi.fn();
    const onDeleteDraft = vi.fn();
    render(<AgreementDetail agreement={documentToAgreement(document)} viewerProfile={document.creatorProfile}
      onEditDraft={onEditDraft} onDeleteDraft={onDeleteDraft} onOpenMessages={vi.fn()} />);
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("Invitations not sent")).toBeInTheDocument();
    expect(screen.getByText("Not invited")).toBeInTheDocument();
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
    expect(screen.queryByText("Signatures")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open in Messages" })).not.toBeInTheDocument();
    expect(onEditDraft).not.toHaveBeenCalled();
    expect(onDeleteDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Edit Draft" }));
    expect(onEditDraft).toHaveBeenCalledExactlyOnceWith(document.id);
    fireEvent.click(screen.getByRole("button", { name: /Work & Metadata/ }));
    expect(screen.getAllByText(/Not sent/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it("keeps draft history expandable with draft labeling", () => {
    const document = makeDocument(); document.status = "Draft";
    render(<AgreementDetail agreement={documentToAgreement(document)} viewerProfile={document.creatorProfile} />);
    fireEvent.click(screen.getByRole("button", { name: /Version History/ }));
    expect(screen.getByText("1 version · draft")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.queryByText("Current")).not.toBeInTheDocument();
  });

  it.each(["other owner", "sent", "final"])("does not offer draft editing for %s", kind => {
    const document = makeDocument(); document.status = "Draft";
    const profile = { ...document.creatorProfile };
    if (kind === "other owner") document.creatorUserId = "someone-else";
    if (kind === "sent") { document.sentAt = document.createdAt; document.status = "Pending Split Approval"; }
    if (kind === "final") document.status = "Verified and Stored";
    render(<AgreementDetail agreement={documentToAgreement(document)} viewerProfile={profile} onEditDraft={vi.fn()} onDeleteDraft={vi.fn()} onOpenMessages={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit Draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Draft" })).not.toBeInTheDocument();
    if (kind === "sent") {
      expect(screen.getByRole("button", { name: "Open in Messages" })).toBeInTheDocument();
      expect(screen.getByText("Signatures")).toBeInTheDocument();
    }
  });
});
