import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AccountSettings from '@/components/AccountSettings'

export const metadata = { title: 'Account Settings — FloorOps' }

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="px-8 py-10 max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>
      <AccountSettings
        userId={session.user.id}
        initialName={session.user.name ?? ''}
        userEmail={session.user.email ?? ''}
      />
    </div>
  )
}
