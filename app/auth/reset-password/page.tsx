import ResetPasswordForm from './ResetPasswordForm'

export const metadata = { title: 'Reset Password — FloorOps' }

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token ?? ''

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Invalid Link</h1>
          <p className="text-sm text-gray-400">This reset link is missing or invalid.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">FloorOps</h1>
        <p className="mb-8 text-sm text-gray-400">Choose a new password for your account</p>
        <ResetPasswordForm token={token} />
      </div>
    </main>
  )
}
