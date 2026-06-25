import ConfirmEmailClient from './ConfirmEmailClient'

export const metadata = { title: 'Confirm Email — FloorOps' }

export default function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl text-center">
        <h1 className="mb-6 text-2xl font-bold text-white">FloorOps</h1>
        <ConfirmEmailClient token={searchParams.token ?? ''} />
      </div>
    </main>
  )
}
