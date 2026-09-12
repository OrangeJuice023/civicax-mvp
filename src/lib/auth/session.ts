/**
 * Sessions: a signed, httpOnly cookie carrying a short-lived JWT.
 *
 * ---------------------------------------------------------------------------
 * Why this and not NextAuth
 * ---------------------------------------------------------------------------
 * Kawing has exactly one credential type (email + password against a seeded
 * User row) and three roles. NextAuth would add an adapter, a callback surface,
 * and its own route handlers to review - a lot of moving parts for a prototype
 * whose security story a reader has to be able to audit in one sitting. Signing
 * a small claim set with jose is a short, fully visible amount of code.
 *
 * The token is SIGNED, NOT ENCRYPTED. Anyone holding the cookie can read its
 * claims. That is acceptable only because every claim describes the cookie's
 * own owner (their id, name, email, role, office). Never add a claim you would
 * not show the user it belongs to, and never add another person's data.
 *
 * ---------------------------------------------------------------------------
 * The claim-staleness limitation, stated plainly
 * ---------------------------------------------------------------------------
 * Role and office live in the token, so this module needs no database and works
 * unchanged in middleware and on the edge. The price is that the token is a
 * SNAPSHOT: if an administrator changes someone's role, moves them to another
 * office, or sets isActive = false, the old cookie keeps asserting the old
 * values until it expires (see SESSION_TTL_SECONDS). For v0.1 that window is
 * accepted and bounded. Anything that must not tolerate it - deactivating a
 * compromised account, for instance - has to re-read the User row server-side;
 * this module intentionally does not, so it stays pure and testable.
 *
 * Authorization decisions are NOT made here. This module only establishes who
 * the caller is. What they may do lives in policy.ts.
 */

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { AuthError } from './errors'
// Relative, not '@/lib/...': keeps this module resolvable by plain node and by
// vitest without a path-alias config of its own.
import { isRole, type Role } from '../domain/constants'

export type SessionUser = {
  userId: string
  email: string
  name: string
  role: Role
  /**
   * Null for citizens, and possible for an officer who has not been posted to
   * an office yet. policy.ts denies every office-scoped action in that case
   * rather than treating null as a wildcard.
   */
  officeId: string | null
  /** Denormalised for display only. Never used in an authorization test. */
  officeName: string | null
  position: string | null
}

export const SESSION_COOKIE_NAME = 'kawing_session'

/**
 * Eight hours: about one working shift, so a frontline officer signs in once at
 * the start of the day. There is no sliding refresh in v0.1 - the expiry is
 * absolute, which is the conservative choice and keeps the staleness window
 * described above from being extended indefinitely by activity.
 */
export const SESSION_TTL_SECONDS = 8 * 60 * 60

const JWT_ALGORITHM = 'HS256'
const JWT_ISSUER = 'kawing'
const JWT_AUDIENCE = 'kawing-app'

/**
 * HMAC-SHA256 wants a key at least as long as its hash output. Shorter keys are
 * accepted by the algorithm and are exactly the kind of thing that quietly
 * survives to production, so they are rejected here.
 */
const MIN_SECRET_LENGTH = 32

/**
 * Values that must never be treated as a real secret. The first is the literal
 * placeholder in .env.example - the single most likely misconfiguration, since
 * copying that file is the documented setup step.
 */
const PLACEHOLDER_SECRETS: readonly string[] = [
  'replace-me-with-a-32-byte-random-hex-string',
  'changeme',
  'change-me',
  'secret',
  'development',
  'kawing',
]

let cachedKey: Uint8Array | null = null
let warnedAboutEphemeralKey = false

function describeSecretProblem(raw: string): string | null {
  if (raw.length === 0) return 'SESSION_SECRET is not set'
  if (PLACEHOLDER_SECRETS.includes(raw.toLowerCase())) {
    return 'SESSION_SECRET is still a placeholder value from .env.example'
  }
  if (raw.length < MIN_SECRET_LENGTH) {
    return `SESSION_SECRET is only ${raw.length} characters; HS256 needs at least ${MIN_SECRET_LENGTH}`
  }
  return null
}

/**
 * Report whether the signing key is real, without revealing it.
 *
 * Exposed so an operations or transparency page can show the misconfiguration
 * instead of leaving it in a server log nobody reads.
 */
export function sessionSecretStatus(): { configured: boolean; problem: string | null } {
  const problem = describeSecretProblem((process.env.SESSION_SECRET ?? '').trim())
  return { configured: problem === null, problem }
}

/**
 * Resolve the signing key, lazily.
 *
 * Lazily, because evaluating this at module load would make a production build
 * fail on a machine that has no .env - the check belongs at first use, which is
 * request time.
 *
 * In production a bad secret THROWS. In development it warns loudly and signs
 * with a random key generated once per process. That fallback is deliberately
 * not a hardcoded constant: a hardcoded development key is a real key that
 * ships in the repository, and every deployment that forgot to set its own
 * would share it. An ephemeral key instead makes the misconfiguration felt -
 * sessions do not survive a server restart, and two workers reject each other's
 * cookies - while still letting a first-time contributor run the prototype.
 */
function getSigningKey(): Uint8Array {
  if (cachedKey) return cachedKey

  const raw = (process.env.SESSION_SECRET ?? '').trim()
  const problem = describeSecretProblem(raw)

  if (problem === null) {
    cachedKey = new TextEncoder().encode(raw)
    return cachedKey
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Kawing refuses to issue sessions: ${problem}. Generate a key with the ` +
        'command documented in .env.example and set SESSION_SECRET in the environment.',
    )
  }

  if (!warnedAboutEphemeralKey) {
    warnedAboutEphemeralKey = true
    console.warn(
      [
        '',
        '  Kawing SESSION WARNING',
        `  ${problem}.`,
        '  Signing sessions with a random key generated for this process only.',
        '  Every session is invalidated when the server restarts.',
        '  This would be a hard error in production. Set SESSION_SECRET in .env.',
        '',
      ].join('\n'),
    )
  }

  cachedKey = crypto.getRandomValues(new Uint8Array(32))
  return cachedKey
}

/**
 * Cookie attributes, in one place so the login and logout handlers cannot drift
 * apart (a logout that clears a cookie with a different path leaves the session
 * live).
 *
 * httpOnly - script must not be able to read the session token, so an XSS bug
 *            cannot become credential theft.
 * sameSite - 'lax', not 'strict'. Lax still withholds the cookie from
 *            cross-site POST/PUT/DELETE, which covers the classic CSRF shape,
 *            but keeps the session on top-level GET navigations, so an officer
 *            following a link to a case from an email or a chat is not bounced
 *            to the login screen. Honest limitation: v0.1 has no per-form CSRF
 *            token and relies on this attribute alone.
 * secure   - production only; local development is plain HTTP.
 */
export type SessionCookieAttributes = {
  httpOnly: true
  sameSite: 'lax'
  secure: boolean
  path: '/'
  maxAge: number
}

export function sessionCookieAttributes(): SessionCookieAttributes {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}

/** The same attributes with maxAge 0 - what a logout handler sets. */
export function clearedSessionCookieAttributes(): SessionCookieAttributes {
  return { ...sessionCookieAttributes(), maxAge: 0 }
}

/**
 * Mint the signed token for a user. Returns the JWT; the caller sets it as a
 * cookie named SESSION_COOKIE_NAME using sessionCookieAttributes().
 *
 * Throws rather than issuing a token for an incoherent SessionUser, because a
 * token carrying a role Kawing does not recognise is a token policy.ts would
 * later have to reason about with no clean way to reject it.
 */
export async function createSessionCookie(user: SessionUser): Promise<string> {
  if (!user.userId || !user.email) {
    throw new Error('createSessionCookie: userId and email are required.')
  }
  if (!isRole(user.role)) {
    throw new Error(`createSessionCookie: unknown role "${String(user.role)}".`)
  }

  const key = getSigningKey()
  const issuedAt = Math.floor(Date.now() / 1000)

  return await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    officeId: user.officeId,
    officeName: user.officeName,
    position: user.position,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
    .setSubject(user.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(key)
}

function readStringClaim(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Rebuild a SessionUser from verified claims.
 *
 * The signature has already been checked by the time this runs, so the claims
 * are authentic - but "authentic" is not "well-formed". A token minted by an
 * older build could be missing a claim, and the role has to be re-checked
 * against the vocabulary because the union type is erased at runtime. Anything
 * unexpected returns null and the caller is treated as anonymous.
 */
function toSessionUser(payload: JWTPayload): SessionUser | null {
  const userId = readStringClaim(payload.sub)
  const email = readStringClaim(payload.email)
  const roleClaim = readStringClaim(payload.role)
  if (!userId || !email || !roleClaim || !isRole(roleClaim)) return null

  return {
    userId,
    email,
    name: readStringClaim(payload.name) ?? email,
    role: roleClaim,
    officeId: readStringClaim(payload.officeId),
    officeName: readStringClaim(payload.officeName),
    position: readStringClaim(payload.position),
  }
}

/**
 * Verify a token string. Exported separately from readSession so it can be
 * exercised without a request context, and used from middleware, which reaches
 * the cookie its own way.
 *
 * Pinning algorithms matters: without it, a token whose header claims alg none
 * or a different family would be evaluated on the sender's terms. Issuer and
 * audience are pinned so a token minted for some other jose-signed system that
 * happens to share the secret cannot be replayed here.
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  // Outside the try on purpose: a misconfigured secret is an operator error and
  // must surface as an error, not be laundered into "nobody is signed in".
  const key = getSigningKey()
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      // A small allowance for clock drift between browser and server.
      clockTolerance: 5,
    })
    return toSessionUser(payload)
  } catch {
    // Expired, tampered with, or minted under a previous secret. To a caller
    // these are all the same thing: not signed in.
    return null
  }
}

/**
 * The current caller, or null.
 *
 * Next.js 16's cookies() is async and must be awaited. Reading it opts the
 * calling route or page into dynamic rendering, which is correct here: a page
 * whose contents depend on who is asking must never be statically cached.
 */
export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE_NAME)?.value
  // Checked before touching the signing key so public pages still render on a
  // server whose SESSION_SECRET is missing.
  if (!token) return null
  return await verifySessionToken(token)
}

/** The current caller, or an UNAUTHENTICATED AuthError. */
export async function requireSession(): Promise<SessionUser> {
  const user = await readSession()
  if (!user) throw AuthError.unauthenticated()
  return user
}

/**
 * Require one of the given roles.
 *
 * This is a coarse gate - "is this caller even the kind of user this route is
 * for" - and it is not sufficient on its own. Whether the caller may touch a
 * PARTICULAR case is a policy.can() question, because that depends on the
 * case's applicant and current office. Use both: requireRole to reject the
 * wrong kind of user early, can() for the row-level decision.
 *
 * Called with no roles it degrades to requireSession, which is why the empty
 * case is explicit rather than an accidental deny-all or allow-all.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireSession()
  if (roles.length > 0 && !roles.includes(user.role)) {
    throw AuthError.forbidden()
  }
  return user
}
