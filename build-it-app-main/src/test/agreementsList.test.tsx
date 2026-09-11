import { useRef, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgreementsList from "@/components/AgreementsList";
import { INITIAL_LIBRARY_VIEW, type LibraryPosition, type LibraryView } from "@/lib/splitLibrary";
import { documentToAgreement, type Agreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";

vi.mock("@/components/Dashboard", () => ({ StatusBadge: ({ status }: { status: string }) => <span>{status}</span> }));
const records = ["Draft", "Pending Split Approval", "Fully Signed", "Archived"].map((status, index) => ({
  ...documentToAgreement(makeDocument()), id: `split-${index}`, title: `Work ${index + 1}`, status: status as Agreement["status"],
}));

function Harness({ agreements = records, loading = false, loadError = false, onRetry = vi.fn(), onSelect = vi.fn(), onNew = vi.fn(), initialView = INITIAL_LIBRARY_VIEW }: {
  agreements?: Agreement[]; loading?: boolean; loadError?: boolean; onRetry?: () => void; onSelect?: (agreement: Agreement) => void;
  onNew?: () => void; initialView?: LibraryView;
}) {
  const [view, setView] = useState(initialView);
  const position = useRef<LibraryPosition>({ top: 0, focusId: null });
  return <AgreementsList agreements={agreements} view={view} onViewChange={setView} scrollPosition={position}
    onSelect={onSelect} onNew={onNew} loading={loading} loadError={loadError} onRetry={onRetry} />;
}

describe("split sheet library", () => {
  it("filters records by status and search, and recovers from no results", () => {
    render(<Harness />);
    expect(screen.getAllByRole("button", { name: /^Open Work/ })).toHaveLength(4);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Drafts" }), { button: 0, ctrlKey: false });
    expect(screen.getAllByRole("button", { name: /^Open Work/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Open Work 1 preview" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "missing" } });
    expect(screen.getByText("No matching split sheets")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("button", { name: /^Open Work/ })).toHaveLength(4);
  });

  it("opens the selected record once from its title or surrounding row", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Work 1 preview" }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(records[0]);
    fireEvent.click(screen.getByText("Fully Signed"));
    expect(onSelect).toHaveBeenLastCalledWith(records[2]);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("paginates larger libraries, resets pages on search, and clamps a page after deletion", () => {
    const agreements = Array.from({ length: 26 }, (_, index) => ({ ...records[0], id: `draft-${index}`, title: `Work ${index + 1}` }));
    const { rerender } = render(<Harness agreements={agreements} />);
    expect(screen.getAllByRole("button", { name: /^Open Work/ })).toHaveLength(25);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Work 26 preview" })).toBeInTheDocument();
    rerender(<Harness agreements={agreements.slice(0, 25)} />);
    expect(screen.getAllByRole("button", { name: /^Open Work/ })).toHaveLength(25);
    expect(screen.queryByText("Page 2 of 2")).not.toBeInTheDocument();
    rerender(<Harness agreements={agreements} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Work 1" } });
    expect(screen.getByRole("button", { name: "Open Work 1 preview" })).toBeInTheDocument();
    expect(screen.queryByText("Page 2 of 2")).not.toBeInTheDocument();
  });

  it("shows honest loading and retry states without discarding available records", () => {
    const retry = vi.fn();
    const { rerender } = render(<Harness agreements={[]} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading split sheets");
    expect(screen.queryByText("No split sheets yet")).not.toBeInTheDocument();
    rerender(<Harness agreements={[]} loadError onRetry={retry} />);
    expect(screen.getByText("Split sheets unavailable")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<Harness loadError />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Open Work/ })).toHaveLength(4);
  });

  it("provides a create action for an empty library", () => {
    const onNew = vi.fn();
    render(<Harness agreements={[]} onNew={onNew} />);
    expect(screen.getByText("No split sheets yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New SPLIT" }));
    expect(onNew).toHaveBeenCalledOnce();
  });
});
