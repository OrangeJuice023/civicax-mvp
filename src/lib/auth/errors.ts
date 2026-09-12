/**
 * Authorization failures as a typed error.
 *
 * Why a dedicated error class rather than returning null or throwing a plain
 * Error: the two failure modes have to stay distinguishable all the way up to
 * the HTTP boundary. "Not signed in" is a 401 and should send the caller to the
 * login screen; "signed in but not permitted" is a 403 and must NOT, because
 * re-authenticating as the same user would change nothing. Collapsing them
 * produces the classic redirect loop, and - worse - a 401 on a forbidden
 * resource leaks the hint that a different account could reach it.
 *
 * The message is safe to show a user. It deliberately never names the office,
 * the applicant, or the role that WOULD have been allowed: an authorization
 * message that explains the rule is an enumeration oracle.
 */

export type AuthErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN'

const DEFAULT_MESSAGES: Record<AuthErrorCode, string> = {
  UNAUTHENTICATED: 'Sign in to continue.',
  FORBIDDEN: 'You do not have permission to do that.',
}

/**
 * Carried on the error so route handlers do not each re-derive the mapping and
 * accidentally answer 500 (which would look like a Kawing bug) or 200.
 */
const HTTP_STATUS: Record<AuthErrorCode, 401 | 403> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
}

export class AuthError extends Error {
  readonly code: AuthErrorCode
  readonly httpStatus: 401 | 403

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code])
    this.name = 'AuthError'
    this.code = code
    this.httpStatus = HTTP_STATUS[code]
  }

  static unauthenticated(message?: string): AuthError {
    return new AuthError('UNAUTHENTICATED', message)
  }

  static forbidden(message?: string): AuthError {
    return new AuthError('FORBIDDEN', message)
  }
}

/**
 * Prefer this over a bare `instanceof` at the HTTP boundary.
 *
 * Next.js can legitimately load the same module twice (server component graph
 * and route handler chunk), and two copies of this file mean two distinct
 * AuthError constructors, so `instanceof` returns false for an error that IS
 * one. The structural fallback keeps a 403 from degrading into a 500.
 */
export function isAuthError(value: unknown): value is AuthError {
  if (value instanceof AuthError) return true
  if (!(value instanceof Error) || value.name !== 'AuthError') return false
  const code = (value as { code?: unknown }).code
  return code === 'UNAUTHENTICATED' || code === 'FORBIDDEN'
}
