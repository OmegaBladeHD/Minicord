# Changelog

## [Unreleased]

### Added
- Browser notifications for background messages.
- Emoji picker integration in composer.
- Virtualized message list for long conversations.
- Premium dark UI polish (skeletons, tooltips, unread badges, hover/glow interactions).

### Security
- Helmet, restricted CORS, and global rate limiting.
- JWT access/refresh token flow with Redis-backed refresh storage.
- Zod validation on API payloads.

### Changed
- Introduced HTTP status constants to remove magic numbers in backend handlers.
- Strengthened middleware consistency and centralized status usage.

## [0.1.0] - 2026-02-12

### Added
- Local self-hosted messaging MVP (auth, DMs, groups, realtime messages).
- Presence updates and basic voice state signaling.
