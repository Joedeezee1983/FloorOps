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

export interface PartRequestEmailData {
  partName: string
  quantity: number
  urgency: string
  description: string | null
  machineInfo: string | null
  requestedByName: string | null
  notes: string | null
}

/**
 * Sends a part request notification to the inventory tech.
 */
export async function sendPartRequestEmail(to: string, data: PartRequestEmailData): Promise<void> {
  const urgencyLabel = data.urgency === 'URGENT' ? 'URGENT' : 'Normal'
  const rows = [
    `<tr><td style="color:#94a3b8;padding:4px 0;font-size:13px">Part</td><td style="color:#f8fafc;padding:4px 0;font-size:13px;font-weight:600">${data.partName}</td></tr>`,
    `<tr><td style="color:#94a3b8;padding:4px 0;font-size:13px">Quantity</td><td style="color:#f8fafc;padding:4px 0;font-size:13px">${data.quantity}</td></tr>`,
    `<tr><td style="color:#94a3b8;padding:4px 0;font-size:13px">Priority</td><td style="padding:4px 0"><span style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;background:${data.urgency === 'URGENT' ? '#7f1d1d' : '#1e3a5f'};color:${data.urgency === 'URGENT' ? '#fca5a5' : '#93c5fd'}">${urgencyLabel}</span></td></tr>`,
    data.machineInfo ? `<tr><td style="color:#94a3b8;padding:4px 0;font-size:13px">Machine</td><td style="color:#f8fafc;padding:4px 0;font-size:13px">${data.machineInfo}</td></tr>` : '',
    data.description ? `<tr><td style="color:#94a3b8;padding:4px 0;font-size:13px">Description</td><td style="color:#f8fafc;padding:4px 0;font-size:13px">${data.description}</td></tr>` : '',
    data.requestedByName ? `<tr><td style="color:#94a3b8;padding:4px 0;font-size:13px">Requested by</td><td style="color:#f8fafc;padding:4px 0;font-size:13px">${data.requestedByName}</td></tr>` : '',
    data.notes ? `<tr><td style="color:#94a3b8;padding:4px 0;font-size:13px">Notes</td><td style="color:#f8fafc;padding:4px 0;font-size:13px">${data.notes}</td></tr>` : '',
  ].filter(Boolean).join('')

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;padding:0 16px">
    <div style="background:#1e293b;border-radius:12px;border:1px solid #334155;padding:32px">
      <p style="color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px">FloorOps</p>
      <div style="height:1px;background:#334155;margin:12px 0 24px"></div>
      <h2 style="color:#f8fafc;font-size:18px;font-weight:600;margin:0 0 16px">New Part Request</h2>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0">Log in to FloorOps to update the request status.</p>
    </div>
  </div>
</body>
</html>`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${data.urgency === 'URGENT' ? '[URGENT] ' : ''}Part Request: ${data.partName}`,
    html,
  })
}

export interface ServiceAlertEmailData {
  alertType: string
  message: string | null
  machineInfo: string | null
  createdByName: string | null
}

/**
 * Sends a service alert notification email to all supervisors/admins at the location.
 * Uses a single Resend call with all recipients in `to` — appropriate for internal staff.
 */
export async function sendServiceAlertEmail(
  recipients: string[],
  data: ServiceAlertEmailData
): Promise<void> {
  if (recipients.length === 0) return

  const isHighPriority = data.alertType === 'Machine Down' || data.alertType === 'Security'
  const badgeBackground = isHighPriority ? '#7f1d1d' : '#713f12'
  const badgeColor = isHighPriority ? '#fca5a5' : '#fde68a'
  const borderColor = isHighPriority ? '#7f1d1d' : '#334155'

  const rows = [
    `<tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;width:100px">Alert Type</td><td style="padding:6px 0"><span style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;background:${badgeBackground};color:${badgeColor}">${data.alertType}</span></td></tr>`,
    data.machineInfo
      ? `<tr><td style="color:#94a3b8;padding:6px 0;font-size:13px">Machine</td><td style="color:#f8fafc;padding:6px 0;font-size:13px;font-family:monospace">${data.machineInfo}</td></tr>`
      : '',
    data.message
      ? `<tr><td style="color:#94a3b8;padding:6px 0;font-size:13px">Message</td><td style="color:#f8fafc;padding:6px 0;font-size:13px">${data.message}</td></tr>`
      : '',
    data.createdByName
      ? `<tr><td style="color:#94a3b8;padding:6px 0;font-size:13px">Sent by</td><td style="color:#f8fafc;padding:6px 0;font-size:13px">${data.createdByName}</td></tr>`
      : '',
  ].filter(Boolean).join('')

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;padding:0 16px">
    <div style="background:#1e293b;border-radius:12px;border:1px solid ${borderColor};padding:32px">
      <p style="color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px">FloorOps</p>
      <div style="height:1px;background:#334155;margin:12px 0 24px"></div>
      <h2 style="color:#f8fafc;font-size:18px;font-weight:600;margin:0 0 16px">Service Alert: ${data.alertType}</h2>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0">Log in to FloorOps to acknowledge or resolve this alert.</p>
    </div>
  </div>
</body>
</html>`

  await getResend().emails.send({
    from: FROM,
    to: recipients,
    subject: `[FloorOps Alert] ${data.alertType}${data.machineInfo ? ` — ${data.machineInfo}` : ''}`,
    html,
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
