import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Loader2, Music, Pencil, Search, X } from "lucide-react";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { appleMusicAvailable, searchAppleMusic } from "@/lib/appleMusicSearch";
import { trackDuration, type AppleMusicTrack } from "@/lib/appleMusicCatalog";
import "./sample-track-search.css";

interface Props {
  artist: string;
  title: string;
  track: AppleMusicTrack | null;
  onTrackChange: (track: AppleMusicTrack | null) => void;
  onChange: (values: { sampleOriginalArtist: string; sampleOriginalWork: string }) => void;
}

function Artwork({ track }: { track: AppleMusicTrack }) {
  const [failed, setFailed] = useState(false);
  return <span className="sample-track-artwork">
    {track.artworkUrl && !failed
      ? <img src={track.artworkUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <Music className="h-5 w-5" aria-hidden="true" />}
  </span>;
}

export default function SampleTrackSearch({ artist, title, track, onTrackChange, onChange }: Props) {
  const selected = track?.artist === artist && track?.title === title ? track : null;
  const [mode, setMode] = useState<"search" | "manual">((artist || title) && !selected ? "manual" : "search");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<AppleMusicTrack[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const manualRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (mode !== "search" || selected) return;
    const controller = new AbortController();
    setAvailable(null); setConnectionError(false);
    appleMusicAvailable(controller.signal).then(value => {
      if (!controller.signal.aborted) setAvailable(value);
    }).catch(() => {
      if (!controller.signal.aborted) { setAvailable(false); setConnectionError(true); }
    });
    return () => controller.abort();
  }, [retry, mode, selected]);

  useEffect(() => {
    const controller = new AbortController();
    const id = ++requestId.current;
    const term = query.trim();
    setTracks([]); setError("");
    if (mode !== "search" || selected || !available || dismissed || term.length < 2) {
      setStatus("idle"); return () => controller.abort();
    }
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchAppleMusic(term, controller.signal);
        if (!controller.signal.aborted && requestId.current === id) { setTracks(results); setStatus("ready"); }
      } catch (failure) {
        if (!controller.signal.aborted && requestId.current === id) {
          setError(failure instanceof Error && failure.name === "Error" ? failure.message : "Apple Music is unavailable right now. Try again or enter the song manually.");
          setStatus("error");
        }
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, mode, selected, available, retry, dismissed]);

  function manual() {
    ++requestId.current;
    setMode("manual"); onTrackChange(null);
    requestAnimationFrame(() => manualRef.current?.focus());
  }
  function search() {
    setMode("search"); setDismissed(false);
    requestAnimationFrame(() => searchRef.current?.focus());
  }
  function choose(song: AppleMusicTrack) {
    ++requestId.current;
    onChange({ sampleOriginalArtist: song.artist, sampleOriginalWork: song.title });
    onTrackChange(song); setQuery(""); setTracks([]); setStatus("idle");
    requestAnimationFrame(() => editRef.current?.focus());
  }

  return <TooltipProvider delayDuration={250}>
    <div className="sample-track-search">
      <div className="sample-track-heading">
        <span className="flex items-center gap-2 text-sm font-medium"><Music className="h-4 w-4 text-muted-foreground" />Sampled song</span>
        <span className="text-xs text-muted-foreground">Apple Music</span>
      </div>
      {selected ? <div className="sample-track-selection">
        <Artwork key={selected.id} track={selected} />
        <div className="sample-track-copy"><strong>{selected.title}</strong><span>{selected.artist}</span><small>{selected.album}</small></div>
        <div className="sample-track-actions">
          <Tooltip><TooltipTrigger asChild><a href={selected.url} target="_blank" rel="noopener noreferrer" className="sample-track-icon" aria-label={`Open ${selected.title} in Apple Music`}><ExternalLink className="h-4 w-4" /></a></TooltipTrigger><TooltipContent>Open in Apple Music</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button type="button" ref={editRef} className="sample-track-icon" aria-label="Edit sample details" onClick={manual}><Pencil className="h-4 w-4" /></button></TooltipTrigger><TooltipContent>Edit details</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button type="button" className="sample-track-icon" aria-label="Remove sampled song" onClick={() => { onTrackChange(null); onChange({ sampleOriginalArtist: "", sampleOriginalWork: "" }); search(); }}><X className="h-4 w-4" /></button></TooltipTrigger><TooltipContent>Remove song</TooltipContent></Tooltip>
        </div>
      </div> : <>
        <div className="sample-track-modes" role="group" aria-label="Sample entry method">
          <button type="button" aria-pressed={mode === "search"} onClick={search}><Search className="h-3.5 w-3.5" />Search</button>
          <button type="button" aria-pressed={mode === "manual"} onClick={manual}><Pencil className="h-3.5 w-3.5" />Enter manually</button>
        </div>
        {mode === "manual" ? <div className="grid gap-4 sm:grid-cols-2">
          <label className="sample-manual-field">Sample Artist<input ref={manualRef} value={artist} onChange={event => onChange({ sampleOriginalArtist: event.target.value, sampleOriginalWork: title })} placeholder="Artist of the sampled work" /></label>
          <label className="sample-manual-field">Sample Title<input value={title} onChange={event => onChange({ sampleOriginalWork: event.target.value, sampleOriginalArtist: artist })} placeholder="Title of the sampled work" /></label>
        </div> : available ? <>
          {(artist || title) && <p className="mb-3 break-words text-xs text-muted-foreground">Current sample: {[title, artist].filter(Boolean).join(" / ")}</p>}
          <Command shouldFilter={false} label="Search sampled song" className="sample-track-command" onKeyDown={event => {
            if (event.key === "Escape") { event.preventDefault(); setDismissed(true); }
          }}>
            <CommandInput ref={searchRef} aria-label="Search sampled song" placeholder="Search song title or artist" maxLength={120} value={query}
              onValueChange={value => { setQuery(value); setTracks([]); setDismissed(false); ++requestId.current; }} onFocus={() => setDismissed(false)} />
            <CommandList label="Apple Music songs">
              {status === "loading" && <div role="status" className="sample-track-message"><Loader2 className="h-4 w-4 animate-spin" />Searching Apple Music...</div>}
              {status === "error" && <div className="sample-track-message sample-track-error"><p role="alert">{error}</p><Button type="button" variant="ghost" size="sm" onClick={() => setRetry(value => value + 1)}>Try again</Button></div>}
              {status === "ready" && tracks.length === 0 && <p role="status" className="sample-track-message">No matching songs. Try another title or enter it manually.</p>}
              {status === "ready" && tracks.map(song => <CommandItem key={song.id} value={song.id} onSelect={() => choose(song)} className="sample-track-result">
                <Artwork track={song} />
                <span className="sample-track-copy"><strong>{song.title}</strong><span>{song.artist}</span><small>{song.album}</small></span>
                <span className="sample-track-duration">{trackDuration(song.durationMs)}</span>
                <Check className="sample-track-check h-4 w-4" aria-hidden="true" />
              </CommandItem>)}
            </CommandList>
          </Command>
          <span className="sr-only" role="status">{status === "ready" && tracks.length > 0 ? `${tracks.length} songs found` : ""}</span>
        </> : <div className="sample-track-unavailable" role="status">
          {available === null ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Connecting to Apple Music...</span></> : <>
            <span>{connectionError ? "Apple Music search is unavailable right now." : "Apple Music search is not connected yet."}</span>
            <Button type="button" variant="ghost" size="sm" onClick={manual}>Enter song manually</Button>
          </>}
        </div>}
      </>}
    </div>
  </TooltipProvider>;
}
