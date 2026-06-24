import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AdminDashboard from '@/components/AdminDashboard'

export const metadata = { title: 'Admin — FloorOps' }

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return <AdminDashboard currentUserId={session.user.id} />
}
