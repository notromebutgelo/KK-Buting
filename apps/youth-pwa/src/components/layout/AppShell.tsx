import { ReactNode } from 'react'
import BottomNav from './BottomNav'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-transparent">
      <main className="flex-1 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
