# Apple Music Sample Search

## Current Scope

Search the Apple Music catalog for a known sampled song, then copy its title and artist into the existing sample-disclosure fields. Those fields already flow into saved drafts, invitations, review, agreement details and PDF exports. Selection does not set clearance, rights holders, or ownership percentages.

Artwork, album, duration and the Apple Music link are catalog context in the current creation session, not permanent agreement data. Returning to the Sample step preserves that selection during the session. Reopening a saved draft shows the stored artist/title as editable manual fields. No database migration is required.

Manual entry works with no Apple account, during an outage, or for unreleased/unlisted music. No simulated results are shipped to users.

## Connect Apple

1. Enroll in the Apple Developer Program. Do not buy an Apple Music listener subscription for this feature; developer credentials are separate.
2. In Certificates, Identifiers & Profiles, create a MusicKit media identifier and a MusicKit-enabled private key associated with it. Record the Team ID and Key ID. Download the `.p8` file and keep it private.
3. Put these **server-only** environment variables in the local ignored `.env.local` file, and later in Vercel for each intended environment:

   - `APPLE_MUSIC_TEAM_ID`: 10-character Team ID.
   - `APPLE_MUSIC_KEY_ID`: 10-character Key ID.
   - `APPLE_MUSIC_PRIVATE_KEY`: complete `.p8` contents, including its BEGIN/END lines. Multiline text or escaped `\n` line breaks are supported.
   - `APPLE_MUSIC_STOREFRONT`: `us` by default. Catalog availability varies by storefront.

   The server also uses the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to validate SPLIT sessions. A service-role key is not needed. Never put Apple credentials in a `VITE_` variable, source code, chat, screenshots, or a committed file.
4. Restart the local Vite server after changing local secrets. Redeploy after setting Vercel environment variables. The Vite middleware and Vercel function run the same handler.
5. Sign into SPLIT, create a split, select Sample > Yes, search for a known track, select the correct version, and verify the review and saved draft. Repeat with manual entry and an unavailable search.

## Security and Operations

- Only the availability boolean is public. Searches validate the bearer session against Supabase Auth before calling Apple. Anonymous sessions cannot search.
- Apple ES256 developer tokens are signed server-side, expire in 20 minutes, and never reach the browser. Private keys remain on the server.
- Search accepts only a bounded text query. Requests go only to the configured Supabase project and Apple's fixed catalog endpoint. Result links/artwork are allowlisted to Apple hosts.
- Calls have timeouts. Invalid keys, 429s, upstream errors and malformed responses become safe error messages with manual entry available.
- The 350ms debounce and 30-search/minute per-account limiter reduce accidental bursts. The limiter is **per function instance**, not a distributed quota. Before broad public rollout, configure a Vercel Firewall rate limit for `/api/apple-music` or use a shared limiter if stricter quotas are needed.
- No autoplay, audio recognition, library access or user Apple Music sign-in is implemented. The search query and SPLIT session go to SPLIT's API; Apple receives the query and server developer token, not the user's SPLIT identity. Artwork loads from Apple directly.
- Unit tests and browser fixtures cover configured behavior. Live Apple authentication, catalog responses and the deployed Vercel function still need verification once real credentials are supplied.

## References

- [MusicKit](https://developer.apple.com/musickit/)
- [Create a media identifier and private key](https://developer.apple.com/help/account/configure-app-capabilities/create-a-media-identifier-and-private-key/)
- [Developer tokens](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)
- [Catalog search](https://developer.apple.com/documentation/applemusicapi/search-for-catalog-resources-(by-type))
