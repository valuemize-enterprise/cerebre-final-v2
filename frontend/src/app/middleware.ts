import { NextRequest, NextResponse } from 'next/server';

/**
 * Sabi Edge Middleware
 * ─────────────────────────────────────────────────────────────
 * IMPORTANT: This app stores auth tokens in localStorage, not cookies.
 * Edge middleware runs on the server and has NO access to localStorage —
 * only to cookies. An earlier version of this file attempted to read
 * `sabi_token` / `sabi_client_token` as cookies, which are never set
 * anywhere in this codebase. That caused every logged-in user to be
 * bounced back to the login screen on every navigation.
 *
 * Real auth enforcement happens client-side in:
 *   - components/layout/AgencyLayout.tsx  (agency + admin routes)
 *   - app/client/layout.tsx               (client portal routes)
 *   - components/layout/StaffLayout       (staff portal routes)
 *   - components/providers/SessionGuard   (global 401 interceptor +
 *                                           first-login redirect)
 *
 * This middleware is intentionally minimal: it only handles the
 * root path redirect, which is safe to do at the edge since it
 * doesn't depend on auth state.
 *
 * If you later move to cookie-based auth (e.g. httpOnly session
 * cookies set by the backend on login), real edge-level route
 * protection can be reintroduced here by reading those cookies.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
