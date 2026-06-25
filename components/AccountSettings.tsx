'use client'

import { useState } from 'react'

export interface AccountSettingsProps {
  userId: string
  initialName: string
  userEmail: string
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

const SECTION_CLS = 'rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4'

type MessageState = { type: 'success' | 'error'; text: string } | null

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  )
}

function StatusMessage({ message }: { message: MessageState }) {
  if (!message) return null
  return (
    <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
      {message.text}
    </p>
  )
}

function SaveButton({ isLoading, label }: { isLoading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? 'Saving…' : label}
    </button>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json() as { error?: string }
      setMessage(res.ok
        ? { type: 'success', text: 'Name updated.' }
        : { type: 'error', text: json.error ?? 'Failed to update name.' }
      )
    } catch {
      setMessage({ type: 'error', text: 'Failed to update name.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={SECTION_CLS}>
      <SectionHeading title="Profile" subtitle="Update your display name" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLS}
            placeholder="Your full name"
            required
          />
        </div>
        <StatusMessage message={message} />
        <SaveButton isLoading={isLoading} label="Save Name" />
      </form>
    </div>
  )
}

// ─── Email section ────────────────────────────────────────────────────────────

function EmailSection({ userEmail }: { userEmail: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword }),
      })
      const json = await res.json() as { data?: { message: string }; error?: string }
      if (res.ok) {
        setMessage({ type: 'success', text: json.data?.message ?? 'Confirmation email sent.' })
        setNewEmail('')
        setCurrentPassword('')
      } else {
        setMessage({ type: 'error', text: json.error ?? 'Failed to request email change.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to request email change.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={SECTION_CLS}>
      <SectionHeading title="Email" subtitle="Change your email address — we'll send a confirmation link to the new address" />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1.5">Current Email</p>
        <p className="text-sm text-gray-300 px-3 py-2 bg-gray-800/60 rounded-lg border border-gray-700/50">{userEmail}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="newEmail">New Email</FieldLabel>
          <input
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={INPUT_CLS}
            placeholder="new@example.com"
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="emailCurrentPassword">Current Password</FieldLabel>
          <input
            id="emailCurrentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={INPUT_CLS}
            placeholder="Confirm your identity"
            required
          />
        </div>
        <StatusMessage message={message} />
        <SaveButton isLoading={isLoading} label="Send Confirmation" />
      </form>
    </div>
  )
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const json = await res.json() as { error?: string }
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password updated.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: json.error ?? 'Failed to update password.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update password.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={SECTION_CLS}>
      <SectionHeading title="Password" subtitle="Update your account password" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={INPUT_CLS}
            placeholder="Your current password"
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={INPUT_CLS}
            placeholder="Min. 8 characters"
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="confirmNewPassword">Confirm New Password</FieldLabel>
          <input
            id="confirmNewPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={INPUT_CLS}
            placeholder="Repeat your new password"
            required
          />
        </div>
        <StatusMessage message={message} />
        <SaveButton isLoading={isLoading} label="Update Password" />
      </form>
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function AccountSettings({ initialName, userEmail }: AccountSettingsProps) {
  return (
    <div className="space-y-6">
      <ProfileSection initialName={initialName} />
      <EmailSection userEmail={userEmail} />
      <PasswordSection />
    </div>
  )
}
