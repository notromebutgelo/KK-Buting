import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import ThemeBootstrap from '@/components/providers/ThemeBootstrap'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KK Admin Panel',
  description: 'Kabataang Katipunan Administration Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <ThemeBootstrap />
        {children}
      </body>
    </html>
  )
}
