import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ROLE_HIERARCHY } from '@/constants'

export const metadata = { title: 'Dashboard — FloorOps' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { user } = session
  const roleLevel = ROLE_HIERARCHY[user.role]

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">FloorOps Dashboard</h1>
          <p className="mt-1 text-gray-400">
            Welcome, {user.name ?? user.email} &mdash;{' '}
            <span className="font-medium text-blue-400">{user.role}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Floor Map" description="Real-time machine status grid" href="/map" />
          <StatCard label="Machines" description="Machine registry and details" href="/machines" />
          {roleLevel >= ROLE_HIERARCHY.SUPERVISOR && (
            <StatCard label="Shifts" description="Manage and brief shift teams" href="/shifts" />
          )}
          {roleLevel >= ROLE_HIERARCHY.ADMIN && (
            <StatCard label="Admin" description="Users, locations, and settings" href="/admin" />
          )}
        </div>
      </div>
    </main>
  )
}

interface StatCardProps {
  label: string
  description: string
  href: string
}

function StatCard({ label, description, href }: StatCardProps) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-blue-700 hover:bg-gray-800"
    >
      <h2 className="text-lg font-semibold text-white">{label}</h2>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </a>
  )
}
