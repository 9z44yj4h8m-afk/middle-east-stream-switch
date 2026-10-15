<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Resolve voice profile IDs to supported provider IDs centrally; share preview/chat delivery prompts for compatibility.
- Keep /admin-chat open and /admin-voices viewport-height, ending with save; extra tools stay in a dialog, owner guards and writes protected. Crop header/avatar artwork separately so controls remain interactive.
- Store performers and named clips in private chat-recordings with admin-only storage and normalized voice_chat settings; public playback serves only enabled configured paths to prevent arbitrary private-file access.
- Render the chat transcript and roster above one full-width composer; use container-bounded appearance sizing so saved owner dimensions never overflow the chat window.
- Merge per-series YouTube metadata into one ordered drama catalog at /bedouin-drama; never mix public videos with private IPTV or claim a live channel.
- Keep optional series cover artwork separate from episode thumbnails in the typed drama catalog; render cover banners intact without duplicate overlays so episode imagery stays unchanged.
- Admin password-only login authenticates the fixed owner account server-side through Cloud Auth and checks user_roles before returning a session; never bypass RLS with a shared PIN.

- Keep channel metadata in one typed array in src/lib/channels.ts so the player, AI search and AI chat share one catalog; deep links use /live?channel=<id> and /channels/<section-slug> (slugs defined once in the sections array in portal-page).
- Keep AI channel search server-side and validate returned IDs against the supplied catalog so generated channels can never enter the player.
- Resolve each YouTube channel's current live video server-side (resolveYoutubeLive, using youtubeChannelId) and embed by video ID, because YouTube's embed/live_stream?channel= URL shows "video unavailable".
- Keep homepage member/chat entry artwork separate from the shared MemberPlatforms destinations on /auth; preserve private access gates so moving cards never exposes streams.
- Keep the homepage player explicit-start and public category/live players active on entry; public movie pages choose a language-matched random film after hydration and autoplay muted to respect browser policies.
- Ship the site as an installable web app via public/manifest.webmanifest (start_url /vip) with no service worker, so installs never serve stale cached files.
- Relay streams whose CDN demands a specific Referer through /api/public/hls (host allow-list, playlists rewritten), because browsers cannot set Referer.
- Build the featured-movies list server-side from official YouTube channel searches (getFeaturedMovies, 1h cache, full-length filter) with the hand-picked list in src/lib/movies.ts as fallback.
- Keep the private IPTV library as one responsive Smarters-style interface with server-side search and external-player actions; group series episodes by series title and live channels by stream group before listing individual items, and support movie group/search deep links from homepage collections.

- Persist member names in profiles and gate all private stream reads with authenticated, JWT-session-scoped unlock rows; a separate public Smarters catalog exposes only channel names and groups, never URLs, provider IDs or credential-bearing logos.
- Keep featured subscription metadata separate from public streams and resolve library matches server-side; detail pages must never substitute unrelated channels or fabricate schedules.
- Owner-editable site data (texts, contacts, design colors, extra/hidden channels and movies) lives in admin-only-write tables and is merged client-side via src/lib/site-config.ts on top of the static catalogs, so the code catalogs stay the fallback.

- Share the broadcast shell, wordmark, footer and four-item nav; preserve page guards. Keep section artwork in a browser-safe map separate from streams, with owner image overrides winning.
- Keep bulk channel creation and editable broadcast schedules in the admin content manager using existing admin-RLS tables; validate streams before batch insertion and invalidate shared schedule queries after saves so public schedules stay current.
- Store card copy, images, allow-listed destinations, order and visibility in section-content with static defaults; apply ordering to home categories, member platforms and sections without changing category IDs or access guards.
- Manage chat rooms via create_chat_room and admin-RLS deletion; the general room has no deletable row.
- Persist per-card font and size overrides alongside section content and render them through bounded, allow-listed scoped SectionCardStyle rules; preserve existing styles when no override is saved.
- Keep Smarters banner presentation in a shared catalog component using featured-channel metadata; live banners filter public names and VOD links retain the existing member gate so artwork never exposes private streams.
- /100 edits site_settings("voice_panel") (panel texts, colors, hidden/custom voices); custom voices store only a built-in provider ID plus delivery prompt.
