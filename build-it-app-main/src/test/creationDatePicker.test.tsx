import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CreationDatePicker from "@/components/contract-builder/CreationDatePicker";
import StepMetadata from "@/components/contract-builder/StepMetadata";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { makeDocument } from "@/test/fixtures/splitSheet";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import { DEFAULT_CONTRACT, getTodayDateInputValue } from "@/components/contract-builder/types";

const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor);
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
});

function Harness({ initial = "2026-09-15", onChange = vi.fn() }) {
  const [value, setValue] = useState(initial);
  return <><CreationDatePicker id="date" value={value} max="2026-09-15" onChange={date => { setValue(date); onChange(date); }} /><output data-testid="stored-date">{value}</output></>;
}
const openCalendar = () => fireEvent.click(screen.getByRole("button", { name: /^Creation Date,/ }));

describe("creation date picker", () => {
  it("uses the new heading without changing other form labels or values", () => {
    const onChange = vi.fn();
    render(<StepMetadata data={{ ...DEFAULT_CONTRACT, songTitle: "Night Swim", creationDate: getTodayDateInputValue(), artistProjectName: "Chori", recordingArtist: "Chori" }} signedInArtistName="Chori" onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Create a New Split" })).toBeInTheDocument();
    expect(screen.getByLabelText("Work Title")).toHaveValue("Night Swim");
    expect(screen.getByText("Artist / Project")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Optional details" })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects a date, stores the date-only value, closes and restores focus", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    openCalendar();
    const selected = screen.getByRole("gridcell", { name: "Tuesday, September 15, 2026" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(selected).toHaveFocus());
    fireEvent.click(screen.getByRole("gridcell", { name: "Monday, September 14, 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-14");
    expect(screen.getByTestId("stored-date")).toHaveTextContent("2026-09-14");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Creation Date, September 14, 2026" })).toHaveFocus());
    openCalendar();
    expect(screen.getByRole("gridcell", { name: "Monday, September 14, 2026" })).toHaveAttribute("aria-selected", "true");
  });

  it("blocks future days and future months", () => {
    const onChange = vi.fn(); render(<Harness onChange={onChange} />); openCalendar();
    const future = screen.getByRole("gridcell", { name: "Wednesday, September 16, 2026" });
    expect(future).toBeDisabled(); fireEvent.click(future); expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Month" }), { key: "Enter" });
    expect(screen.getByRole("option", { name: "October" })).toHaveAttribute("aria-disabled", "true");
  });

  it("navigates months and years without changing the saved date until selection", () => {
    const onChange = vi.fn(); render(<Harness onChange={onChange} />); openCalendar();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveTextContent("August");
    const year = screen.getByRole("spinbutton", { name: "Year" });
    fireEvent.change(year, { target: { value: "2024" } }); fireEvent.keyDown(year, { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Month" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "February" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("gridcell", { name: "Thursday, February 29, 2024" }));
    expect(onChange).toHaveBeenCalledWith("2024-02-29");
  });

  it("resets invalid years and keeps historical dates available", () => {
    render(<Harness initial="1899-12-31" />); openCalendar();
    const year = screen.getByRole("spinbutton", { name: "Year" });
    expect(year).toHaveValue(1899);
    fireEvent.change(year, { target: { value: "2027" } }); fireEvent.blur(year);
    expect(year).toHaveValue(1899);
    fireEvent.change(year, { target: { value: "" } }); fireEvent.keyDown(year, { key: "Enter" });
    expect(year).toHaveValue(1899);
    expect(screen.getByRole("gridcell", { name: "Sunday, December 31, 1899" })).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard date selection and Escape without a change", async () => {
    const onChange = vi.fn(); render(<Harness onChange={onChange} />); openCalendar();
    const selected = screen.getByRole("gridcell", { name: "Tuesday, September 15, 2026" });
    fireEvent.keyDown(selected, { key: "ArrowLeft" });
    const previous = screen.getByRole("gridcell", { name: "Monday, September 14, 2026" });
    await waitFor(() => expect(previous).toHaveFocus());
    fireEvent.keyDown(previous, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects Today from an older month and closes the calendar", async () => {
    const onChange = vi.fn(); render(<Harness initial="2020-03-08" onChange={onChange} />); openCalendar();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-15");
    expect(screen.getByRole("button", { name: /^Creation Date,/ })).toHaveTextContent("09/15/2026");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("carries the chosen date into review and the draft save payload", async () => {
    const draft = makeDocument();
    draft.status = "Draft"; draft.sentAt = undefined; draft.data.creationDate = "2024-01-15";
    const store = vi.fn(async (document: StoredSplitSheetDocument) => ({ document, persisted: true as const }));
    render(<ContractBuilder userProfile={draft.creatorProfile} initialDocument={draft} onBack={vi.fn()} onStoreDocument={store} onSendDocument={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Work" }));
    openCalendar();
    fireEvent.click(screen.getByRole("gridcell", { name: "Sunday, January 14, 2024" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("navigation", { name: "Split creation steps" })).getByRole("button", { name: "Review" }));
    expect(screen.getByText("2024-01-14")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(store).toHaveBeenCalledOnce());
    expect(store.mock.calls[0][0].data.creationDate).toBe("2024-01-14");
  });
});
