const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

module.exports = (phase) => {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER

  /** @type {import('next').NextConfig} */
  return {
    poweredByHeader: false,
    // Keep dev and production outputs separate so `next build` doesn't corrupt a live `next dev` session.
    distDir: isDevServer ? '.next-dev' : '.next',
    images: { domains: ['firebasestorage.googleapis.com'] },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
        },
      ]
    },
  }
}
