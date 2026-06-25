import { Resend } from 'resend'
import { env } from '@/lib/env'

const FROM = 'FloorOps <noreply@jay-de.com>'

function getResend(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(env.RESEND_API_KEY)
}

/**
 * Sends an invite email to a newly created user with a link to set up their account.
 */
export async function sendInviteEmail(to: string, token: string): Promise<void> {
  const url = `${env.NEXTAUTH_URL}/auth/setup?token=${token}`
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "You've been invited to FloorOps",
    html: buildEmail({
      heading: "You've been invited to FloorOps",
      body: 'Your account has been created at FloorOps. Click the link below to set your password and get started.',
      cta: { label: 'Set Up My Account', url },
      footer: 'Link expires in 7 days.',
    }),
  })
}

/**
 * Sends a password reset email with a single-use reset link.
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${env.NEXTAUTH_URL}/auth/reset-password?token=${token}`
  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Reset your FloorOps password',
    html: buildEmail({
      heading: 'Reset your FloorOps password',
      body: 'We received a request to reset your FloorOps password. Click the link below to set a new password.',
      cta: { label: 'Reset Password', url },
      footer: "Link expires in 1 hour. If you didn't request this, ignore this email.",
    }),
  })
}

/**
 * Sends a confirmation email to the new address when a user requests an email change.
 */
export async function sendEmailConfirmEmail(to: string, token: string): Promise<void> {
  const url = `${env.NEXTAUTH_URL}/auth/confirm-email?token=${token}`
  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Confirm your new FloorOps email',
    html: buildEmail({
      heading: 'Confirm your new FloorOps email',
      body: 'You requested to change your FloorOps email address. Click the link below to confirm your new email.',
      cta: { label: 'Confirm Email', url },
      footer: 'Link expires in 24 hours.',
    }),
  })
}

interface EmailOptions {
  heading: string
  body: string
  cta: { label: string; url: string }
  footer: string
}

function buildEmail({ heading, body, cta, footer }: EmailOptions): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;padding:0 16px">
    <div style="background:#1e293b;border-radius:12px;border:1px solid #334155;padding:32px">
      <p style="color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px">FloorOps</p>
      <div style="height:1px;background:#334155;margin:12px 0 24px"></div>
      <h2 style="color:#f8fafc;font-size:18px;font-weight:600;margin:0 0 12px">${heading}</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px">${body}</p>
      <a href="${cta.url}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${cta.label}</a>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0">${footer}</p>
    </div>
  </div>
</body>
</html>`
}
