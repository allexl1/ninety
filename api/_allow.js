// Strict allowlist for anything keyed. Client never holds secrets;
// all keyed fetches go through /api/* and are checked here (prod)
// and mirrored by devApi() in vite.config.js (local).
export const ALLOW = new Set(['health', 'daily-seed']);
