import { NextResponse } from 'next/server'
import { clearedSessionCookieAttributes, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', clearedSessionCookieAttributes())
  return response
}
