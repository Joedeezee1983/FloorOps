import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import ShiftDashboard from '@/components/ShiftDashboard'

export const metadata = { title: 'Shifts — FloorOps' }

export const dynamic = 'force-dynamic'

export default async function ShiftsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userName = session.user.name ?? session.user.email ?? 'Unknown'

  return (
    <ShiftDashboard userRole={session.user.role} userName={userName} />
  )
}
