import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import MachinesTable from '@/components/MachinesTable'

export const metadata = { title: 'Machine Registry — FloorOps' }

export const dynamic = 'force-dynamic'

export default async function MachinesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <MachinesTable userRole={session.user.role} />
    </div>
  )
}
