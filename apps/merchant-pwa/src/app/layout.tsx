import type { Metadata, Viewport } from 'next'
import RegisterServiceWorker from '@/components/RegisterServiceWorker'
import './globals.css'

export const metadata: Metadata = {
  title: 'Buting Merchants',
  description: 'Merchant QR redemption and shop operations workspace.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Buting Merchants',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#07549a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  )
}
