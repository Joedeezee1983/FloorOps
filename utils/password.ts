import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'

const ITERATIONS = 100000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

/**
 * Hashes a plain-text password using PBKDF2.
 * Returns a "{salt}:{hash}" string suitable for storage.
 */
export function hashPassword(plain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    pbkdf2(plain, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, key) => {
      if (err) reject(err)
      else resolve(`${salt}:${key.toString('hex')}`)
    })
  })
}

/**
 * Compares a plain-text password against a stored "{salt}:{hash}" string.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function comparePasswords(plain: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return resolve(false)

    pbkdf2(plain, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, key) => {
      if (err) reject(err)
      else {
        const storedHash = Buffer.from(hash, 'hex')
        resolve(timingSafeEqual(key, storedHash))
      }
    })
  })
}
