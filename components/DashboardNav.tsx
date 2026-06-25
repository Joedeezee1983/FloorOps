'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { UserRole } from '@/types'

export interface DashboardNavProps {
  userRole: UserRole
}

interface NavTab {
  label: string
  href: string
  adminOnly: boolean
}

const NAV_TABS: NavTab[] = [
  { label: 'Floor Map', href: '/map', adminOnly: false },
  { label: 'Machines', href: '/machines', adminOnly: false },
  { label: 'Shifts', href: '/shifts', adminOnly: false },
  { label: 'Admin', href: '/admin', adminOnly: true },
]

export default function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const visibleTabs = NAV_TABS.filter((tab) => !tab.adminOnly || userRole === 'ADMIN')
  const isSettingsActive = pathname.startsWith('/settings')

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <nav className="border-b border-gray-800 bg-gray-950">
      <div className="flex items-center gap-1 px-4 sm:px-6 h-14">
        <span className="text-sm font-bold text-white tracking-wide mr-4 sm:mr-6">FloorOps</span>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-1 flex-1">
          {visibleTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-700/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}

          <div className="ml-auto flex items-center gap-2">
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

        {/* Mobile hamburger button */}
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

      {/* Mobile dropdown menu */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-800 bg-gray-950 pb-2">
          {visibleTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={closeMenu}
                className={`block px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'text-blue-400 bg-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
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
  )
}
