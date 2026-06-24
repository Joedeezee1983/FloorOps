'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  const visibleTabs = NAV_TABS.filter((tab) => !tab.adminOnly || userRole === 'ADMIN')

  return (
    <nav className="border-b border-gray-800 bg-gray-950">
      <div className="flex items-center gap-1 px-6 h-14">
        <span className="text-sm font-bold text-white tracking-wide mr-6">FloorOps</span>
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
      </div>
    </nav>
  )
}
