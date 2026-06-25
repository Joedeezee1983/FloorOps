import { prisma } from '@/lib/db'
import type { TokenType } from '@prisma/client'

const EXPIRY_MS: Record<TokenType, number> = {
  INVITE: 7 * 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  EMAIL_CONFIRM: 24 * 60 * 60 * 1000,
}

/**
 * Creates a new single-use token for the given user and type.
 * For EMAIL_CONFIRM tokens, pass the new email address as the payload.
 * Returns the raw token string to embed in the email link.
 */
export async function createToken(
  userId: string,
  type: TokenType,
  payload?: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + EXPIRY_MS[type])
  const record = await prisma.userToken.create({
    data: { userId, type, expiresAt, payload: payload ?? null },
    select: { token: true },
  })
  return record.token
}

export interface ConsumedToken {
  id: string
  userId: string
  payload: string | null
}

/**
 * Validates a token by type, marks it as used, and returns userId + payload.
 * Throws a descriptive error if the token is invalid, expired, or already used.
 */
export async function validateAndConsumeToken(
  token: string,
  type: TokenType
): Promise<ConsumedToken> {
  const record = await prisma.userToken.findUnique({
    where: { token },
    select: { id: true, userId: true, type: true, expiresAt: true, usedAt: true, payload: true },
  })

  if (!record || record.type !== type) throw new Error('Invalid token')
  if (record.usedAt) throw new Error('This link has already been used')
  if (record.expiresAt < new Date()) throw new Error('This link has expired')

  await prisma.userToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  return { id: record.id, userId: record.userId, payload: record.payload }
}
