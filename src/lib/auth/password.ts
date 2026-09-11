/**
 * Password hashing.
 *
 * ---------------------------------------------------------------------------
 * Why bcrypt, and why cost factor 12
 * ---------------------------------------------------------------------------
 * bcryptjs is a pure-JavaScript bcrypt. It needs no native build step, which is
 * what makes `npm install && npm run dev` work on any machine - the whole point
 * of a prototype someone else has to be able to run. The trade-off is honest:
 * pure JS is several times slower per round than native bcrypt or a memory-hard
 * KDF like Argon2id. For a production deployment of this system, Argon2id (or
 * scrypt) would be the better choice; bcrypt's 72-byte input limit and lack of
 * a memory-hardness parameter are real weaknesses, not stylistic ones.
 *
 * Cost 12 means 2^12 = 4096 key-expansion iterations. Measured on the machine
 * this was written on, that is roughly 0.5s per hash in pure JS - deliberately
 * expensive, because the cost is paid once per login by one user and per guess
 * by an attacker running billions of them. OWASP's Password Storage guidance
 * puts the bcrypt work factor at 10 or more; 12 is the common current default
 * and leaves headroom as hardware improves.
 *
 * Two consequences worth stating rather than discovering later:
 *   - A login request spends ~0.5s in CPU here. The async API below chunks its
 *     work and yields to the event loop between chunks, so it does not block
 *     other requests the way hashSync() would. Never use the *Sync variants on
 *     a server path.
 *   - Seeding N demo users costs roughly N x 0.5s. That is expected; do not
 *     "fix" it by lowering the cost, because the seeded hashes are the same
 *     hashes the login path verifies.
 *
 * The cost factor is a compile-time constant on purpose. Reading it from an
 * environment variable invites a deployment where it is quietly set to 4.
 */

import { compare, hash, truncates } from 'bcryptjs'

/** bcrypt work factor. See the header for why this value and why it is fixed. */
export const BCRYPT_COST = 12

/**
 * bcrypt hashes at most the first 72 UTF-8 bytes of its input, silently. That
 * silence is the danger: if a 200-character passphrase were accepted, every
 * other passphrase sharing its first 72 bytes would also authenticate. CivicaX
 * rejects over-long input at both ends instead of truncating it, so no stored
 * hash can ever have a shorter effective secret than the user believes.
 */
export const MAX_PASSWORD_BYTES = 72

/**
 * A floor, not a policy. Real password rules for a government deployment are a
 * matter for the agency's ICT policy (and, in the Philippines, for its Data
 * Privacy Act compliance posture); CivicaX does not invent one. This only stops
 * an empty or one-character string from reaching the hasher.
 */
export const MIN_PASSWORD_LENGTH = 8

/**
 * A real bcrypt hash of a random throwaway string, at the same cost factor.
 *
 * Purpose: user enumeration defence. If the login route skips verification when
 * the email is unknown, it answers in ~1ms instead of ~500ms, and that timing
 * difference tells an attacker which email addresses have accounts. Callers
 * should verify against this decoy when no user row was found, so both paths
 * cost the same. Nothing authenticates against it - no password produced it.
 */
const DECOY_HASH = '$2b$12$4Ha0HmWdjjL0zJ0OSL27FeGb9.4tnMFPrJgCDCwXkCFj.Iv4lA5Ri'

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PasswordPolicyError'
  }
}

/**
 * Hash a plaintext password for storage in User.passwordHash.
 *
 * Throws PasswordPolicyError for input bcrypt cannot represent faithfully.
 * Throwing rather than returning null is intentional: a caller that ignores the
 * result of a hash would otherwise store something unusable.
 */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new PasswordPolicyError('A password is required.')
  }
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordPolicyError(
      `A password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  }
  if (truncates(plain)) {
    throw new PasswordPolicyError(
      `A password must be at most ${MAX_PASSWORD_BYTES} bytes when UTF-8 encoded. ` +
        'Accented characters and emoji use more than one byte each.',
    )
  }
  return await hash(plain, BCRYPT_COST)
}

/**
 * Check a plaintext password against a stored hash.
 *
 * Returns false rather than throwing for every failure mode, including a
 * malformed or empty stored hash. Rationale: an exception on the login path
 * becomes a 500, and a 500 that only happens for certain accounts is itself an
 * information leak. A corrupted hash must fail closed and be invisible to the
 * caller. (bcryptjs already returns false for an unparseable hash; the guard
 * here does not depend on that staying true.)
 *
 * Over-long input is rejected before comparison for the same reason hashing
 * rejects it: otherwise a 100-byte guess sharing a stored 72-byte password's
 * prefix would verify.
 */
export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  if (typeof plain !== 'string' || plain.length === 0) return false
  if (typeof hashed !== 'string' || hashed.length === 0) return false
  if (truncates(plain)) return false
  try {
    return await compare(plain, hashed)
  } catch {
    return false
  }
}

/**
 * Burn one password verification's worth of CPU and return false.
 *
 * Call this on the "no such user" branch of a login handler so that a request
 * for an unknown email takes the same time as one for a known email. Returns
 * false always, so it can be used directly as the verification result.
 */
export async function verifyPasswordAgainstDecoy(plain: string): Promise<false> {
  await verifyPassword(plain.length > 0 ? plain : 'x'.repeat(MIN_PASSWORD_LENGTH), DECOY_HASH)
  return false
}
