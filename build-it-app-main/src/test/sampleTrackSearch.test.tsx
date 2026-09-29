import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import SampleTrackSearch from "@/components/contract-builder/SampleTrackSearch";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { appleMusicAvailable, searchAppleMusic } from "@/lib/appleMusicSearch";
import type { AppleMusicTrack } from "@/lib/appleMusicCatalog";
import { makeDocument } from "@/test/fixtures/splitSheet";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import { buildSplitSheetPdfModel, supportingFields } from "@/lib/splitSheetPdfModel";

vi.mock("@/lib/appleMusicSearch", () => ({ appleMusicAvailable: vi.fn(), searchAppleMusic: vi.fn() }));
const track: AppleMusicTrack = { id: "123", title: "Night Swim", artist: "Maya", album: "After Hours", artworkUrl: "https://is1-ssl.mzstatic.com/cover.jpg", url: "https://music.apple.com/us/song/night-swim/123", durationMs: 201000 };
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => { if (scrollDescriptor) Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor); else delete (Element.prototype as Partial<Element>).scrollIntoView; });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(appleMusicAvailable).mockResolvedValue(true); vi.mocked(searchAppleMusic).mockResolvedValue([track]); });

function Harness({ artist = "", title = "" }) {
  const [data, setData] = useState({ sampleOriginalArtist: artist, sampleOriginalWork: title });
  const [selected, setSelected] = useState<AppleMusicTrack | null>(null);
  return <><SampleTrackSearch artist={data.sampleOriginalArtist} title={data.sampleOriginalWork} track={selected} onTrackChange={setSelected} onChange={setData} /><output data-testid="data">{JSON.stringify(data)}</output></>;
}
async function search(query = "Night") {
  const input = await screen.findByRole("combobox", { name: "Search sampled song" });
  fireEvent.change(input, { target: { value: query } });
  return input;
}

describe("sample track search", () => {
  it("debounces, renders catalog details and fills the existing artist/title fields", async () => {
    render(<Harness />); await search("Ni"); await search("Night");
    fireEvent.click(await screen.findByRole("option", { name: /Night Swim Maya After Hours/ }));
    expect(searchAppleMusic).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("data")).toHaveTextContent('"sampleOriginalArtist":"Maya"');
    expect(screen.getByTestId("data")).toHaveTextContent('"sampleOriginalWork":"Night Swim"');
    expect(screen.getByRole("link", { name: "Open Night Swim in Apple Music" })).toHaveAttribute("href", track.url);
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit sample details" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Edit sample details" }));
    expect(screen.getByLabelText("Sample Artist")).toHaveValue("Maya");
    expect(screen.getByLabelText("Sample Title")).toHaveValue("Night Swim");
  });

  it("provides manual entry when MusicKit has not been connected", async () => {
    vi.mocked(appleMusicAvailable).mockResolvedValue(false);
    render(<Harness />);
    expect(await screen.findByText("Apple Music search is not connected yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter song manually" }));
    fireEvent.change(screen.getByLabelText("Sample Artist"), { target: { value: "Unreleased artist" } });
    fireEvent.change(screen.getByLabelText("Sample Title"), { target: { value: "Demo" } });
    expect(screen.getByTestId("data")).toHaveTextContent("Unreleased artist");
    expect(searchAppleMusic).not.toHaveBeenCalled();
  });

  it("keeps existing draft fields and unsaved manual input when switching modes", async () => {
    render(<Harness artist="Original artist" title="Original song" />);
    expect(appleMusicAvailable).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Sample Title")).toHaveValue("Original song");
    fireEvent.change(screen.getByLabelText("Sample Title"), { target: { value: "Edited song" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("Current sample: Edited song / Original artist")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter manually" }));
    expect(screen.getByLabelText("Sample Title")).toHaveValue("Edited song");
    await waitFor(() => expect(screen.getByLabelText("Sample Artist")).toHaveFocus());
  });

  it("supports no results, failures and retry without destroying input", async () => {
    vi.mocked(searchAppleMusic).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Too many searches. Wait a minute.")).mockResolvedValue([track]);
    render(<Harness />); await search("Unknown");
    expect(await screen.findByText(/No matching songs/)).toBeInTheDocument();
    await search("Night"); expect(await screen.findByRole("alert")).toHaveTextContent("Too many searches");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("option", { name: /Night Swim/ })).toBeInTheDocument();
  });

  it("ignores stale requests after a newer search or switch to manual entry", async () => {
    let resolveOld: (songs: AppleMusicTrack[]) => void;
    vi.mocked(searchAppleMusic).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce([{ ...track, id: "456", title: "New Song" }]);
    render(<Harness />); await search("Older");
    await waitFor(() => expect(searchAppleMusic).toHaveBeenCalledOnce());
    await search("New"); expect(await screen.findByRole("option", { name: /New Song/ })).toBeInTheDocument();
    await act(async () => resolveOld([track]));
    expect(screen.queryByRole("option", { name: /Night Swim/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter manually" }));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("removes the selected song and leaves search usable", async () => {
    render(<Harness />); await search(); fireEvent.click(await screen.findByRole("option", { name: /Night Swim/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove sampled song" }));
    expect(screen.getByTestId("data")).toHaveTextContent('{"sampleOriginalArtist":"","sampleOriginalWork":""}');
    expect(await screen.findByRole("combobox")).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveFocus());
  });

  it("dismisses results with Escape and never searches one-character queries", async () => {
    render(<Harness />); await search("x");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 400)); });
    expect(searchAppleMusic).not.toHaveBeenCalled();
    const input = await search(); await screen.findByRole("option", { name: /Night Swim/ });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("carries sample data through step navigation, draft storage and PDF fields without implying clearance", async () => {
    const draft = makeDocument(); draft.status = "Draft"; draft.sentAt = undefined;
    draft.data.songTitle = "Sample search QA";
    draft.data.sampleStatus = "No sample or interpolation";
    const store = vi.fn(async (document: StoredSplitSheetDocument) => ({ document, persisted: true as const }));
    render(<ContractBuilder userProfile={draft.creatorProfile} initialDocument={draft} onBack={vi.fn()} onStoreDocument={store} onSendDocument={store} />);
    const navigation = screen.getByRole("navigation", { name: "Split creation steps" });
    fireEvent.click(within(navigation).getByRole("button", { name: "Sample" }));
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await search(); fireEvent.click(await screen.findByRole("option", { name: /Night Swim/ }));
    fireEvent.change(screen.getByLabelText("Seconds Used"), { target: { value: "0-15 sec" } });
    fireEvent.click(within(navigation).getByRole("button", { name: "Review" }));
    expect(screen.getByText("Night Swim")).toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("button", { name: "Sample" }));
    expect(screen.getByRole("link", { name: "Open Night Swim in Apple Music" })).toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(store).toHaveBeenCalledOnce());
    const saved = store.mock.calls[0][0];
    expect(saved.data).toMatchObject({ sampleOriginalArtist: "Maya", sampleOriginalWork: "Night Swim", samplePortion: "0-15 sec", sampleClearanceStatus: "Unsure" });
    const fields = supportingFields(buildSplitSheetPdfModel(saved, saved.creatorProfile)).flatMap(group => group.fields);
    expect(fields).toContainEqual(["Original work", "Night Swim"]);
    expect(fields).toContainEqual(["Original artist", "Maya"]);
  });
});
