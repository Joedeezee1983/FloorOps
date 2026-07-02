import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AlertsPanel from '@/components/AlertsPanel'

export const metadata = { title: 'Alerts — FloorOps' }

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'TECH') redirect('/dashboard')

  return <AlertsPanel userRole={session.user.role} />
}
