/**
 * Validates all required environment variables at module load time.
 * The app fails loudly at startup rather than silently at runtime.
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL as string,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET as string,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL as string,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
}
