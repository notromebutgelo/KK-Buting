import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KK Admin Panel',
  description: 'Kabataang Katipunan Administration Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
