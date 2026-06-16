/**
 * SABI Brand Configuration
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all brand identity.
 * Import this anywhere you need brand text, colours or tokens.
 *
 * Product:  Sabi
 * Parent:   Cerebre Media Africa
 * Token:    sabi_client_token / sabi_token
 */

export const BRAND = {
  /** Product name */
  name: 'Sabi',

  /** Full product name for formal contexts */
  fullName: 'Sabi Intelligence Suite',

  /** One-line sub-brand */
  tagline: 'A product of Cerebre Media Africa',

  /** Short tagline for headers */
  taglineShort: 'By Cerebre Media Africa',

  /** Agency name */
  agency: 'Cerebre Media Africa',

  /** AI engine name */
  aria: 'ARIA',

  /** AI engine full name */
  ariaFull: 'Advanced Reporting & Intelligence Analyst',

  /** Client portal descriptor */
  clientPortalName: 'Sabi Client Portal',

  /** Agency portal descriptor */
  agencyPortalName: 'Sabi Agency Suite',

  /** Support email */
  supportEmail: 'hello@cerebre.media',

  /** Brand website */
  website: 'cerebre.media',

  /** Copyright */
  copyright: `© ${new Date().getFullYear()} Cerebre Media Africa. All rights reserved.`,

  /** Proprietary feature names */
  features: {
    clarityScore: 'ClarityScore™',
    narrativeAI:  'NarrativeAI™',
    velocityTracker: 'VelocityTracker™',
    depthView:    'DepthView™',
    intelliPulse: 'IntelliPulse™',
    momentMap:    'MomentMap™',
    proofEngine:  'Proof of Value Engine',
  },

  /** Storage keys */
  storage: {
    agencyToken:    'sabi_token',
    clientToken:    'sabi_client_token',
    clientInfo:     'sabi_client_info',
    zustandStore:   'sabi-auth',
  },

  /** Brand colours (Tailwind + raw hex) */
  colours: {
    primary:     '#6d28d9',
    primaryLight:'#ede9fe',
    gradient:    'linear-gradient(135deg, #6d28d9, #a78bfa)',
    gradientDark:'linear-gradient(135deg, #060320, #1e1b4b, #4c1d95)',
  },
} as const;

export default BRAND;
