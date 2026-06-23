import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getAllMapMachines } from '@/lib/machines'
import FloorMap from '@/components/FloorMap'

export const metadata = { title: 'Floor Map — FloorOps' }

// Revalidate on every request so the server render is always fresh,
// while the client polls independently for live status updates.
export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const initialMachines = await getAllMapMachines()

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <FloorMap
        initialMachines={initialMachines}
        userRole={session.user.role}
      />
    </div>
  )
}
