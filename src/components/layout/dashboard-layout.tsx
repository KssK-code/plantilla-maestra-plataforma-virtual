'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Footer } from './footer'
import type { UserRole } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  'header.adminPortal':   'Panel de Administración',
  'header.studentPortal': 'Mi Portal de Estudios',
}

interface DashboardLayoutProps {
  children:    React.ReactNode
  role:        UserRole
  userName:    string
  avatarUrl?:  string | null
  nivel?:      string | null
  pageTitle:   string
  showFooter?: boolean
  theme?:      'dark' | 'light'
}

export function DashboardLayout({
  children,
  role,
  userName,
  avatarUrl,
  nivel,
  pageTitle,
  showFooter = false,
  theme = 'dark',
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const translatedTitle = PAGE_TITLES[pageTitle] ?? pageTitle

  const mainBg = theme === 'light' ? '#F8FAFB' : '#0B0D11'

  return (
    <div className="flex min-h-screen" style={{ background: mainBg }}>
      <Sidebar
        role={role}
        userName={userName}
        avatarUrl={avatarUrl}
        nivel={nivel ?? undefined}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-[260px] pb-[60px] md:pb-0">
        <Header
          pageTitle={translatedTitle}
          userName={userName}
          avatarUrl={avatarUrl}
          theme={theme}
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
        {showFooter && <Footer />}
      </div>
    </div>
  )
}
