import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata = { title: 'Forgot Password — FloorOps' }

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">FloorOps</h1>
        <p className="mb-8 text-sm text-gray-400">Enter your email to receive a reset link</p>
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
