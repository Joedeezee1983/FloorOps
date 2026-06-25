import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import LoginForm from '@/components/LoginForm'

export const metadata = { title: 'Sign In — FloorOps' }

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">FloorOps</h1>
        <p className="mb-8 text-sm text-gray-400">Sign in to your account</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
