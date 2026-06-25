'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ConfirmEmailClient({ token }: { token: string }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('This confirmation link is invalid or has expired.')

  useEffect(() => {
    if (!token) {
      setErrorMessage('This confirmation link is invalid.')
      setStatus('error')
      return
    }

    fetch('/api/auth/confirm-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success')
        } else {
          const json = await res.json() as { error?: string }
          setErrorMessage(json.error ?? 'This confirmation link is invalid or has expired.')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMessage('Something went wrong. Please try again.')
        setStatus('error')
      })
  }, [token])

  if (status === 'loading') {
    return (
      <div className="space-y-3">
        <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-400">Confirming your email…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="text-green-400 text-3xl">✓</div>
        <p className="text-base font-semibold text-white">Email updated</p>
        <p className="text-sm text-gray-400">Your email address has been confirmed. Sign in to continue.</p>
        <Link
          href="/login"
          className="block mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Go to Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-red-400">Confirmation failed</p>
      <p className="text-sm text-gray-400">{errorMessage}</p>
      <Link href="/login" className="block text-sm text-blue-400 hover:text-blue-300 transition-colors">
        Back to sign in
      </Link>
    </div>
  )
}
