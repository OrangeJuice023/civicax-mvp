import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/auth/session'
import { approveMilestone, InfrastructureError } from '@/lib/infrastructure/engine'

/**
 * Approve a milestone that is READY_FOR_APPROVAL.
 *
 * Body: { note?: string }
 *
 * approveMilestone() re-derives eligibility from the database - it will
 * refuse a milestone that is not READY_FOR_APPROVAL regardless of what the
 * client believes, which is what makes "4/4 validations" in the browser a
 * display fact rather than something a caller could fake past the server.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  const { projectId, milestoneId } = await params
  const user = await readSession()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  let body: { note?: string } = {}
  try {
    const text = await request.text()
    body = text ? JSON.parse(text) : {}
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  try {
    const result = await approveMilestone({
      projectId,
      milestoneId,
      note: typeof body.note === 'string' ? body.note : undefined,
      actor: user,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof InfrastructureError) {
      const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 409
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status })
    }
    return NextResponse.json({ ok: false, error: 'Approval could not be recorded.' }, { status: 500 })
  }
}
