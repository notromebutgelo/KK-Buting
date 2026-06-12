const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')
const fs = require('fs')
const path = require('path')

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        return env
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) {
        return env
      }

      const key = trimmed.slice(0, separatorIndex).trim()
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      if (key) {
        env[key] = value
      }

      return env
    }, {})
}

const merchantPwaEnv = {
  ...readEnvFile(path.join(__dirname, '.env')),
  ...readEnvFile(path.join(__dirname, '.env.local')),
}

const merchantPwaExampleEnv = readEnvFile(path.join(__dirname, '.env.example'))

const merchantAppEnv = {
  ...readEnvFile(path.join(__dirname, '../merchant-app/.env.example')),
  ...readEnvFile(path.join(__dirname, '../merchant-app/.env')),
}

function publicEnv(key, isDevServer) {
  const nextKey = `NEXT_PUBLIC_${key}`
  const expoKey = `EXPO_PUBLIC_${key}`
  const explicitValue =
    process.env[nextKey] ||
    process.env[expoKey] ||
    merchantPwaEnv[nextKey] ||
    merchantPwaEnv[expoKey]

  if (explicitValue) {
    return explicitValue
  }

  if (key === 'API_URL' && isDevServer) {
    return 'http://localhost:4000/api'
  }

  return merchantAppEnv[nextKey] || merchantAppEnv[expoKey] || merchantPwaExampleEnv[nextKey] || merchantPwaExampleEnv[expoKey] || ''
}

function buildClientEnv(isDevServer) {
  return {
    NEXT_PUBLIC_API_URL: publicEnv('API_URL', isDevServer),
    NEXT_PUBLIC_FIREBASE_API_KEY: publicEnv('FIREBASE_API_KEY', isDevServer),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: publicEnv('FIREBASE_AUTH_DOMAIN', isDevServer),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: publicEnv('FIREBASE_PROJECT_ID', isDevServer),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: publicEnv('FIREBASE_STORAGE_BUCKET', isDevServer),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: publicEnv('FIREBASE_MESSAGING_SENDER_ID', isDevServer),
    NEXT_PUBLIC_FIREBASE_APP_ID: publicEnv('FIREBASE_APP_ID', isDevServer),
  }
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(), microphone=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
]

module.exports = (phase) => {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER

  /** @type {import('next').NextConfig} */
  return {
    poweredByHeader: false,
    env: buildClientEnv(isDevServer),
    distDir: isDevServer ? '.next-dev' : '.next',
    experimental: {
      externalDir: true,
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'firebasestorage.googleapis.com',
        },
        {
          protocol: 'https',
          hostname: '**.fbcdn.net',
        },
      ],
    },
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
