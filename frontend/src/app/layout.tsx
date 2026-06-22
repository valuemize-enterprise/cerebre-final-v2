import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { BRAND } from '@/lib/brand';
import SessionGuard from '@/components/providers/SessionGuard';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.agency}`,
    template: `%s · ${BRAND.name}`,
  },
  description: 'AI-powered marketing intelligence for African brands. ClarityScore™, NarrativeAI™, and Proof of Value — all in one platform.',
  keywords: ['marketing intelligence', 'African marketing', 'Nigeria', 'brand analytics', 'ARIA', 'Cerebre'],
  authors: [{ name: BRAND.agency, url: 'https://cerebre.africa' }],
  creator: BRAND.agency,
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://sabi.cerebre.africa'),
  openGraph: {
    type:        'website',
    locale:      'en_NG',
    title:       `${BRAND.name} Intelligence Platform`,
    description: 'Africa\'s leading AI marketing intelligence platform.',
    siteName:    BRAND.name,
  },
  twitter: {
    card:    'summary_large_image',
    title:   BRAND.name,
    creator: '@cerebremedia',
  },
  robots: {
    index:  false, // SaaS app — don't index
    follow: false,
  },
  manifest: '/manifest.json',
  // Favicon and apple-touch-icon are generated automatically by
  // app/icon.tsx and app/apple-icon.tsx via Next.js's file convention —
  // intentionally no explicit `icons` key here, since /favicon.ico and
  // /apple-touch-icon.png are not static files in this project.
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor:   '#060320',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled content */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            document.documentElement.style.background = '#060320';
          } catch(e) {}
        ` }} />
      </head>
      <body
        className="antialiased min-h-screen"
        style={{
          background:  '#060320',
          color:       'rgba(255,255,255,0.85)',
          fontFamily:  'var(--font-inter), system-ui, sans-serif',
        }}
      >
        {/* Session expiry and hydration guard */}
        <SessionGuard>
          {children}
        </SessionGuard>

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background:  '#1a0f3a',
              color:       'rgba(255,255,255,0.85)',
              border:      '1px solid rgba(109,40,217,0.3)',
              borderRadius:'12px',
              fontSize:    '14px',
              fontWeight:  '500',
              boxShadow:   '0 8px 24px rgba(0,0,0,0.4)',
              padding:     '12px 16px',
            },
            success: {
              iconTheme: { primary: '#059669', secondary: '#fff' },
              style: { borderColor: 'rgba(5,150,105,0.3)' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              style: { borderColor: 'rgba(239,68,68,0.3)' },
            },
            loading: {
              iconTheme: { primary: '#6d28d9', secondary: 'transparent' },
            },
          }}
        />
      </body>
    </html>
  );
}
