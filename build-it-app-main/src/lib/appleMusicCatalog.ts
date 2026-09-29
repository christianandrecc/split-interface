import { z } from "zod";

function catalogUrl(value: string, artwork = false) {
  try {
    const url = new URL(value);
    const validHost = artwork ? url.hostname.endsWith(".mzstatic.com") : url.hostname === "music.apple.com";
    return url.protocol === "https:" && !url.username && !url.password && !url.port && validHost;
  } catch { return false; }
}

export const appleMusicTrackSchema = z.object({
  id: z.string().regex(/^\d+$/).max(30),
  title: z.string().trim().min(1).max(500),
  artist: z.string().trim().min(1).max(500),
  album: z.string().max(500),
  url: z.string().max(2000).refine(value => catalogUrl(value)),
  artworkUrl: z.string().max(2000).refine(value => !value || catalogUrl(value, true)),
  durationMs: z.number().nonnegative().finite().max(86_400_000).nullable(),
});
export type AppleMusicTrack = z.infer<typeof appleMusicTrackSchema>;

const songSchema = z.object({
  id: z.string(), type: z.literal("songs"),
  attributes: z.object({
    name: z.string(), artistName: z.string(), url: z.string(),
    albumName: z.string().optional(), artwork: z.object({ url: z.string() }).optional(),
    durationInMillis: z.number().optional(),
  }),
});

export function normalizeAppleMusicSongs(value: unknown): AppleMusicTrack[] {
  const response = z.object({ results: z.object({ songs: z.object({ data: z.array(z.unknown()) }).optional() }) }).parse(value);
  const ids = new Set<string>();
  return (response.results.songs?.data ?? []).flatMap(item => {
    const song = songSchema.safeParse(item);
    if (!song.success) return [];
    const { id, attributes: a } = song.data;
    const artwork = a.artwork?.url.replaceAll("{w}", "120").replaceAll("{h}", "120") ?? "";
    const track = appleMusicTrackSchema.safeParse({
      id, title: a.name, artist: a.artistName, album: a.albumName ?? "", url: a.url,
      artworkUrl: catalogUrl(artwork, true) ? artwork : "", durationMs: a.durationInMillis ?? null,
    });
    if (!track.success || ids.has(id)) return [];
    ids.add(id);
    return [track.data];
  }).slice(0, 8);
}

export function trackDuration(milliseconds: number | null) {
  if (milliseconds === null) return "";
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
