import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createAppleMusicHandler } from "../../server/appleMusic";
import { normalizeAppleMusicSongs, trackDuration } from "@/lib/appleMusicCatalog";
import { readFileSync } from "node:fs";

const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const env = {
  APPLE_MUSIC_TEAM_ID: "TEAM123456", APPLE_MUSIC_KEY_ID: "KEY1234567",
  APPLE_MUSIC_PRIVATE_KEY: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  VITE_SUPABASE_URL: "https://fixture.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
};
const song = { type: "songs", id: "123", attributes: { name: "Night Swim", artistName: "Maya", albumName: "After Hours",
  url: "https://music.apple.com/us/song/night-swim/123", artwork: { url: "https://is1-ssl.mzstatic.com/image/{w}x{h}bb.jpg" }, durationInMillis: 201000 } };
const catalog = { results: { songs: { data: [song] } } };
const request = (query = "Night Swim", auth = "Bearer fixture-session") => new Request(`http://localhost/api/apple-music?q=${encodeURIComponent(query)}`, { headers: { authorization: auth } });
function dependencies() {
  return vi.fn<typeof fetch>().mockImplementation(async input => String(input).includes("/auth/v1/user")
    ? Response.json({ id: "user-one", is_anonymous: false }) : Response.json(catalog));
}

describe("Apple Music search server", () => {
  it("reports missing setup honestly without calling Apple or exposing credentials", async () => {
    const fetcher = dependencies(), handle = createAppleMusicHandler({ env: {}, fetcher });
    const status = await handle(new Request("http://localhost/api/apple-music"));
    expect(await status.json()).toEqual({ available: false });
    expect(await (await handle(request())).json()).toEqual({ code: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("verifies SPLIT authentication, uses a signed server-only Apple token and returns sanitized songs", async () => {
    const fetcher = dependencies(), now = () => 1_800_000_000_000;
    const response = await createAppleMusicHandler({ env, fetcher, now })(request("Maya & Night"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.tracks[0]).toMatchObject({ title: "Night Swim", artist: "Maya", artworkUrl: "https://is1-ssl.mzstatic.com/image/120x120bb.jpg" });
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ authorization: "Bearer fixture-session", apikey: "public-test-key" });
    const [url, options] = fetcher.mock.calls[1];
    expect(new URL(String(url)).searchParams.get("term")).toBe("Maya & Night");
    expect(new URL(String(url)).searchParams.get("types")).toBe("songs");
    const jwt = (options.headers as Record<string, string>).Authorization.slice(7);
    const [header, claims, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toEqual({ iss: "TEAM123456", iat: 1800000000, exp: 1800001200 });
    expect(verify("sha256", Buffer.from(`${header}.${claims}`), { key: keys.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))).toBe(true);
    expect(JSON.stringify(body)).not.toContain(jwt);
    expect(JSON.stringify(body)).not.toContain("PRIVATE KEY");
  });

  it("rejects invalid queries, missing sessions and unsupported methods before external requests", async () => {
    const fetcher = dependencies(), handle = createAppleMusicHandler({ env, fetcher });
    for (const query of ["", "x", "a".repeat(121), "bad\nquery"]) expect((await handle(request(query))).status).toBe(400);
    expect((await handle(request("song", ""))).status).toBe(401);
    expect((await handle(new Request("http://localhost/api/apple-music", { method: "POST" }))).status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403, 500])("never calls Apple if session validation returns %s", async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("private auth details", { status }));
    const response = await createAppleMusicHandler({ env, fetcher })(request());
    expect(response.status).toBe(status === 500 ? 503 : 401);
    expect(await response.text()).not.toContain("private auth details");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects anonymous auth and malformed MusicKit keys without exposing either", async () => {
    const fetcher = dependencies();
    fetcher.mockResolvedValueOnce(Response.json({ id: "anonymous", is_anonymous: true }));
    expect((await createAppleMusicHandler({ env, fetcher })(request())).status).toBe(401);
    fetcher.mockClear();
    const response = await createAppleMusicHandler({ env: { ...env, APPLE_MUSIC_PRIVATE_KEY: "private invalid key" }, fetcher })(request());
    expect(await response.json()).toEqual({ code: "not_configured" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([401, 403, 429, 500])("handles Apple failure %s without returning upstream errors", async status => {
    const fetcher = dependencies();
    fetcher.mockResolvedValueOnce(Response.json({ id: "user-one" })).mockResolvedValueOnce(new Response("secret upstream info", { status }));
    const response = await createAppleMusicHandler({ env, fetcher })(request());
    expect(response.status).toBe(status === 429 ? 429 : 503);
    expect(await response.text()).not.toContain("secret upstream info");
  });

  it("handles timeouts and malformed results as retryable errors", async () => {
    for (const mode of ["timeout", "malformed"]) {
      const fetcher = dependencies();
      fetcher.mockResolvedValueOnce(Response.json({ id: "user-one" }));
      if (mode === "timeout") fetcher.mockRejectedValueOnce(new Error("private error"));
      else fetcher.mockResolvedValueOnce(Response.json({ invalid: true }));
      expect(await (await createAppleMusicHandler({ env, fetcher })(request())).json()).toEqual({ code: "temporarily_unavailable" });
    }
  });

  it("throttles repeat searches per authenticated account and releases the next window", async () => {
    let time = 1_800_000_000_000;
    const fetcher = dependencies(), handle = createAppleMusicHandler({ env, fetcher, now: () => time });
    for (let index = 0; index < 30; index++) expect((await handle(request())).status).toBe(200);
    expect((await handle(request())).status).toBe(429);
    time += 60_001;
    expect((await handle(request())).status).toBe(200);
  });

  it("normalizes only valid songs, strips unsafe URLs, preserves distinct versions and supports empty results", () => {
    expect(normalizeAppleMusicSongs({ results: {} })).toEqual([]);
    const records = [song, song, { ...song, id: "456", attributes: { ...song.attributes, name: "Night Swim (Live)", artwork: { url: "https://evil.example/image.jpg" } } },
      { ...song, id: "789", attributes: { ...song.attributes, url: "javascript:alert(1)" } }, { ...song, type: "albums" }];
    const normalized = normalizeAppleMusicSongs({ results: { songs: { data: records } } });
    expect(normalized).toHaveLength(2); expect(normalized[1].artworkUrl).toBe("");
    expect(trackDuration(201000)).toBe("3:21"); expect(trackDuration(null)).toBe("");
  });

  it("keeps the API outside the SPA catch-all", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    const rewrite = new RegExp(`^${config.rewrites[0].source}$`);
    expect(rewrite.test("/api/apple-music")).toBe(false);
    expect(rewrite.test("/")).toBe(true); expect(rewrite.test("/settings")).toBe(true);
  });
});
