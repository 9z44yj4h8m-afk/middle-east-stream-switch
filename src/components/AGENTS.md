# Chat rules
- Public chat rooms use chat_rooms and bounded RPC creation; scope history, realtime and bot replies by room_id to isolate conversations.
- Reuse LiveChat with nickname entry, messages, bot replies and notifications; /chat and /live-chat use a standalone shell to match the reference, /auth embeds it; never restore the floating launcher.
- Store chat appearance and bots in admin-write site_settings; bot aliases preserve old message names after renaming. Private bot-avatars uses admin writes and signed reads, never public buckets.
- Normalize bot message vocalization through the shared chat-text helper on write and historical display; preserve visitor text and decorative names so cleanup does not alter identities.
- Voice chat (/voice-chat) reuses LiveChat with voice mode; bot speech is generated server-side only for existing chat message IDs so the endpoint cannot be used as open TTS.
- Keep player behaviour (volume, quality, auto-reconnect with backoff, settings in localStorage) in src/components/live-player.tsx so every page shares one player.
