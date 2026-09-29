import { createPrivateKey, sign } from "node:crypto";
import { normalizeAppleMusicSongs } from "../src/lib/appleMusicCatalog.js";

type Environment = Record<string, string | undefined>;
const reply = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export function createAppleMusicHandler({ env = process.env, fetcher = fetch, now = Date.now }: {
  env?: Environment; fetcher?: typeof fetch; now?: () => number;
} = {}) {
  let token: { value: string; expires: number } | undefined;
  const requests = new Map<string, { count: number; until: number }>();
  const configured = () => Boolean(/^[A-Z0-9]{10}$/.test(env.APPLE_MUSIC_TEAM_ID ?? "")
    && /^[A-Z0-9]{10}$/.test(env.APPLE_MUSIC_KEY_ID ?? "") && env.APPLE_MUSIC_PRIVATE_KEY
    && env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY);

  function developerToken() {
    const seconds = Math.floor(now() / 1000);
    if (token && token.expires > seconds + 60) return token.value;
    const key = createPrivateKey(env.APPLE_MUSIC_PRIVATE_KEY!.replace(/\\n/g, "\n"));
    if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") throw new Error("Invalid MusicKit key");
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const expires = seconds + 1200;
    const payload = `${encode({ alg: "ES256", kid: env.APPLE_MUSIC_KEY_ID })}.${encode({ iss: env.APPLE_MUSIC_TEAM_ID, iat: seconds, exp: expires })}`;
    const signature = sign("sha256", Buffer.from(payload), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
    token = { value: `${payload}.${signature}`, expires };
    return token.value;
  }

  return async function handleAppleMusic(request: Request): Promise<Response> {
    if (request.method !== "GET") return reply({ code: "method_not_allowed" }, 405);
    const params = new URL(request.url).searchParams;
    // Availability is public; catalog access always requires a verified SPLIT session.
    if (!params.has("q")) return reply({ available: configured() });
    const term = params.get("q")!.trim();
    if (term.length < 2 || term.length > 120 || /[\p{Cc}]/u.test(term)) return reply({ code: "invalid_query" }, 400);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer \S+$/i.test(authorization) || authorization.length > 8192) return reply({ code: "sign_in_required" }, 401);
    if (!configured()) return reply({ code: "not_configured" }, 503);
    try {
      const auth = await fetcher(new URL("/auth/v1/user", env.VITE_SUPABASE_URL), {
        headers: { authorization, apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY! }, signal: AbortSignal.timeout(5000),
      });
      if (!auth.ok) return reply({ code: auth.status >= 500 ? "temporarily_unavailable" : "sign_in_required" }, auth.status >= 500 ? 503 : 401);
      const user = await auth.json();
      if (typeof user.id !== "string" || !user.id || user.is_anonymous) return reply({ code: "sign_in_required" }, 401);
      const time = now();
      for (const [id, entry] of requests) if (entry.until <= time) requests.delete(id);
      const entry = requests.get(user.id) ?? { count: 0, until: time + 60_000 };
      if (entry.count >= 30 || (!requests.has(user.id) && requests.size >= 2000)) return reply({ code: "rate_limited" }, 429);
      entry.count += 1;
      requests.set(user.id, entry);
      let bearer: string;
      try { bearer = developerToken(); } catch { return reply({ code: "not_configured" }, 503); }
      const storefront = /^[a-z]{2}$/.test(env.APPLE_MUSIC_STOREFRONT ?? "") ? env.APPLE_MUSIC_STOREFRONT! : "us";
      const url = new URL(`https://api.music.apple.com/v1/catalog/${storefront}/search`);
      url.search = new URLSearchParams({ term, types: "songs", limit: "8" }).toString();
      const response = await fetcher(url, { headers: { Authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(6000) });
      if (response.status === 429) return reply({ code: "rate_limited" }, 429);
      if (response.status === 401 || response.status === 403) { token = undefined; return reply({ code: "not_configured" }, 503); }
      if (!response.ok) return reply({ code: "temporarily_unavailable" }, 503);
      return reply({ tracks: normalizeAppleMusicSongs(await response.json()) });
    } catch {
      // Never return upstream bodies, tokens, account details, or private-key errors.
      return reply({ code: "temporarily_unavailable" }, 503);
    }
  };
}
