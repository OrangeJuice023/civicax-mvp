import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, verifyPasswordAgainstDecoy } from '@/lib/auth/password'
import { createSessionCookie, sessionCookieAttributes, SESSION_COOKIE_NAME, type SessionUser } from '@/lib/auth/session'
import { isRole } from '@/lib/domain/constants'

/**
 * Sign in against a seeded User row.
 *
 * Body: { email: string, password: string }
 *
 * Runs the real credential check (bcrypt against User.passwordHash) and
 * mints the real signed session cookie - there is no demo bypass here. What
 * makes this usable as a demo login is that every seeded identity shares one
 * known password (see prisma/seed.ts and the hint text on the login page),
 * not that this route trusts the request more than a production login would.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { office: { select: { id: true, name: true, shortName: true } } },
  })

  // Constant-time-ish: a request for an unknown email still pays the bcrypt
  // cost, so the response time does not reveal which emails have accounts.
  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPasswordAgainstDecoy(password)

  if (!user || !valid || !user.isActive || !isRole(user.roleCode)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const sessionUser: SessionUser = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.roleCode,
    officeId: user.officeId,
    officeName: user.office?.shortName ?? user.office?.name ?? null,
    position: user.position,
  }

  const token = await createSessionCookie(sessionUser)
  const response = NextResponse.json({ ok: true, user: sessionUser })
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieAttributes())
  return response
}
