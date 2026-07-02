'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import AlertModal from '@/components/AlertModal'
import { ROLE_HIERARCHY, ALERT_POLL_INTERVAL_MS } from '@/constants'
import type { UserRole } from '@/types'

export interface DashboardNavProps {
  userRole: UserRole
}

interface NavTab {
  label: string
  href: string
  minRole: UserRole
}

const NAV_TABS: NavTab[] = [
  { label: 'Floor Map', href: '/map', minRole: 'TECH' },
  { label: 'Machines', href: '/machines', minRole: 'TECH' },
  { label: 'Shifts', href: '/shifts', minRole: 'TECH' },
  { label: 'Alerts', href: '/alerts', minRole: 'SUPERVISOR' },
  { label: 'Admin', href: '/admin', minRole: 'ADMIN' },
]

export default function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  const isSupervisorOrAbove = ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['SUPERVISOR']

  const fetchAlertCount = useCallback(async () => {
    if (!isSupervisorOrAbove) return
    try {
      const res = await fetch('/api/alerts/count')
      if (!res.ok) return
      const json = await res.json() as { data: { count: number } }
      setAlertCount(json.data.count)
    } catch {
      // Badge is non-critical; fail silently
    }
  }, [isSupervisorOrAbove])

  useEffect(() => {
    void fetchAlertCount()
    const interval = setInterval(() => void fetchAlertCount(), ALERT_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchAlertCount])

  const visibleTabs = NAV_TABS.filter(
    (tab) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[tab.minRole]
  )
  const isSettingsActive = pathname.startsWith('/settings')

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <>
      <nav className="border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-1 px-4 sm:px-6 h-14">
          <span className="text-sm font-bold text-white tracking-wide mr-4 sm:mr-6">FloorOps</span>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1 flex-1">
            {visibleTabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-700/50'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                  {tab.href === '/alerts' && alertCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-600 text-white rounded-full px-1">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </Link>
              )
            })}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alert
              </button>
              <Link
                href="/settings"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isSettingsActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-700/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Settings
              </Link>
              <button
                onClick={() => void signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden ml-auto p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {isMenuOpen && (
          <div className="sm:hidden border-t border-gray-800 bg-gray-950 pb-2">
            {visibleTabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-400 bg-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                  {tab.href === '/alerts' && alertCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-600 text-white rounded-full px-1">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </Link>
              )
            })}
            <button
              onClick={() => { closeMenu(); setIsAlertModalOpen(true) }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Send Alert
            </button>
            <Link
              href="/settings"
              onClick={closeMenu}
              className={`block px-4 py-3 text-sm font-medium transition-colors ${
                isSettingsActive ? 'text-blue-400 bg-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Settings
            </Link>
            <button
              onClick={() => { closeMenu(); void signOut({ callbackUrl: '/login' }) }}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {isAlertModalOpen && <AlertModal onClose={() => setIsAlertModalOpen(false)} />}
    </>
  )
}
