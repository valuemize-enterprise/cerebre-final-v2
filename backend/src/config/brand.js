/**
 * Sabi — Brand Configuration (Backend)
 * Used in emails, PDF reports, server logs, and API responses.
 */

module.exports = {
  name:            'Sabi',
  fullName:        'Sabi Intelligence Suite',
  tagline:         'A product of Cerebre Media Africa',
  agency:          'Cerebre Media Africa',
  supportEmail:    process.env.EMAIL_FROM || 'hello@cerebre.media',
  website:         'cerebre.media',
  copyright:       `© ${new Date().getFullYear()} Cerebre Media Africa`,

  features: {
    clarityScore:    'ClarityScore™',
    narrativeAI:     'NarrativeAI™',
    velocityTracker: 'VelocityTracker™',
    depthView:       'DepthView™',
    intelliPulse:    'IntelliPulse™',
  },

  colours: {
    primary: '#6d28d9',
    accent:  '#a78bfa',
  },
};