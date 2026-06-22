import { redirect } from 'next/navigation';

/**
 * Root path fallback.
 * middleware.ts handles this redirect at the edge for the common case,
 * but this page exists as a safety net — e.g. if middleware is ever
 * disabled, misconfigured, or bypassed by a CDN cache rule.
 */
export default function RootPage() {
  redirect('/dashboard');
}
