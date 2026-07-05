/**
 * utils/session.js
 * The `session` cookie is a routing-only signal read by src/middleware.js
 * (Edge runtime, no access to Firebase's IndexedDB-backed client auth
 * state). It is NOT cryptographically verified — Firestore Security
 * Rules remain the real authorization boundary.
 *
 * Kept in one place and called from two spots on purpose:
 *  - authHelper.js sets it synchronously the moment login succeeds, so
 *    it exists before the caller navigates to /dashboard. Without this,
 *    there's a race: router.push("/dashboard") can reach middleware
 *    before the cookie exists, bouncing a freshly-logged-in user back
 *    to "/".
 *  - AuthContext.jsx keeps it in sync afterwards (token refreshes,
 *    sign-outs triggered elsewhere, other tabs) as a safety net.
 */

const SESSION_COOKIE = "session";

export function setSessionCookie(token) {
  // 1 hour, matching the Firebase ID token lifetime.
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=3600; SameSite=Lax`;
}

export function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
