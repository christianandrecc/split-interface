import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { appleMusicTrackSchema } from "./appleMusicCatalog";

export async function appleMusicAvailable(signal: AbortSignal) {
  const response = await fetch("/api/apple-music", { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
  if (!response.ok) throw new Error("Could not connect to Apple Music search.");
  return z.object({ available: z.boolean() }).parse(await response.json()).available;
}

const errors: Record<string, string> = {
  sign_in_required: "Sign in again to search Apple Music. Your sample details are still here.",
  not_configured: "Apple Music search is not connected yet. You can enter the song manually.",
  rate_limited: "Too many searches. Wait a minute and try again, or enter the song manually.",
};

export async function searchAppleMusic(query: string, signal: AbortSignal) {
  const { data, error } = await supabase.auth.getSession();
  signal.throwIfAborted();
  if (error || !data.session) throw new Error(errors.sign_in_required);
  const response = await fetch(`/api/apple-music?${new URLSearchParams({ q: query })}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(errors[body?.code] ?? "Apple Music is unavailable right now. Try again or enter the song manually.");
  return z.object({ tracks: z.array(appleMusicTrackSchema).max(8) }).parse(body).tracks;
}
