import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkspaceOverview from "@/components/WorkspaceOverview";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { createEmptyProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/fixtures/splitSheet";

vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: false, supabase: {} }));

function setup(overrides: Partial<React.ComponentProps<typeof WorkspaceOverview>> = {}) {
  const pending = makeDocument();
  pending.sentAt = pending.createdAt;
  const signed = makeDocument();
  signed.id = "signed-record";
  signed.status = "Fully Signed";
  signed.data.songTitle = "Glasshouse";
  const props = {
    agreements: [pending, signed].map(documentToAgreement),
    userProfile: { ...createEmptyProfile(), ...pending.creatorProfile },
    notifications: [], loading: false, onNew: vi.fn(), onOpenAgreement: vi.fn(),
    onOpenMessages: vi.fn(), onOpenNotification: vi.fn(), onViewActivity: vi.fn(), onRetry: vi.fn(), ...overrides,
  };
  render(<WorkspaceOverview {...props} />);
  return props;
}

describe("workspace overview controls", () => {
  it.each([
    [{ legalFirstName: "Christian", legalMiddleName: "Andre", legalLastName: "Carrera", displayName: "CHORI" }, "Hello, Christian Carrera"],
    [{ legalName: "Christian Andre Carrera" }, "Hello, Christian Carrera"],
    [{ legalFirstName: "Adriano", legalLastName: "Perez Simons" }, "Hello, Adriano Perez Simons"],
    [{ legalFirstName: "  Maya  " }, "Hello, Maya"],
    [{ displayName: "Stage Name" }, "Hello"],
  ])("greets the signed-in user using legal first and last names (%j)", (profile, greeting) => {
    setup({ userProfile: { ...createEmptyProfile(), ...profile } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(greeting);
    expect(screen.queryByRole("heading", { name: "Your workspace" })).not.toBeInTheDocument();
  });

  it("shows one icon-and-count filter row inside the Split sheets section", () => {
    setup();
    const section = screen.getByRole("region", { name: "Split sheets" });
    const filters = within(section).getByRole("group", { name: "Split sheet status filters" });
    const buttons = within(filters).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons.map((button) => button.textContent)).toEqual(["2 All", "1 needs attention", "0 drafts", "1 signed"]);
    buttons.forEach((button) => expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull());
    expect(screen.queryByLabelText("Workspace summary")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "2 All" })).toHaveLength(1);
    expect(within(screen.getByRole("region", { name: "Hello, Christian Carrera" })).queryByRole("button")).not.toBeInTheDocument();
  });

  it("filters drafts directly and restores all records from the same row", () => {
    const draft = makeDocument();
    draft.id = "draft-record";
    draft.status = "Draft";
    draft.data.songTitle = "Session Draft";
    const signed = makeDocument();
    signed.status = "Fully Signed";
    setup({ agreements: [draft, signed].map(documentToAgreement) });
    fireEvent.click(screen.getByRole("button", { name: "1 drafts" }));
    expect(screen.getByRole("button", { name: "1 drafts" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "View draft" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View record" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2 All" }));
    expect(screen.getByRole("button", { name: "2 All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "View record" })).toBeInTheDocument();
  });

  it("filters the table without changing the total counters", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "1 signed" }));
    expect(screen.queryByRole("button", { name: "Night Swim" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Glasshouse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 All" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1 needs attention" }));
    expect(screen.getByRole("button", { name: "Night Swim" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Glasshouse" })).not.toBeInTheDocument();
  });

  it("removes the duplicate search while keeping status filters and empty-state recovery", () => {
    setup();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter and sort split sheets" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "0 drafts" }));
    expect(screen.getByRole("button", { name: "Filter and sort split sheets" })).toHaveAttribute("data-active", "true");
    expect(screen.getByText("No matching split sheets")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: "Night Swim" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter and sort split sheets" })).toHaveAttribute("data-active", "false");
  });

  it("opens the existing record or conversation with the correct id", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "View record" }));
    expect(props.onOpenAgreement).toHaveBeenCalledWith("signed-record");
    fireEvent.click(screen.getByRole("button", { name: "Open messages" }));
    expect(props.onOpenMessages).toHaveBeenCalledWith(props.agreements[0].id);
  });

  it("supports sorting and the draft status filter", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Filter and sort split sheets" }));
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "title" } });
    const table = screen.getByRole("table", { name: "Workspace split sheets" });
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Glasshouse");
    fireEvent.change(screen.getByLabelText("Status", { exact: true }), { target: { value: "drafts" } });
    expect(screen.getByRole("button", { name: "0 drafts" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No matching split sheets")).toBeInTheDocument();
  });

  it("does not mistake loading or a failed fetch for an empty account", () => {
    setup({ agreements: [], loading: true });
    expect(screen.getByText("Loading split sheets...")).toBeInTheDocument();
    expect(screen.queryByText("Your first SPLIT starts here")).not.toBeInTheDocument();
  });

  it("offers a real retry and preserves the last available table on fetch failure", () => {
    const props = setup({ loadError: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Showing the last available records");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Night Swim" })).toBeInTheDocument();
  });

  it("opens the new SPLIT builder from an empty account", () => {
    const props = setup({ agreements: [] });
    fireEvent.click(screen.getByRole("button", { name: "New SPLIT" }));
    expect(props.onNew).toHaveBeenCalledOnce();
  });

  it("opens the private guide without triggering any conversation or record action", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open Elephant private guide" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Nothing is posted to your conversations");
    expect(props.onOpenMessages).not.toHaveBeenCalled();
    expect(props.onOpenAgreement).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Night Swim/ }));
    expect(props.onOpenMessages).toHaveBeenCalledWith(props.agreements[0].id);
  });
});
