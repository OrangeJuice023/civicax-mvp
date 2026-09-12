import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/auth/session'
import { completeValidation, InfrastructureError } from '@/lib/infrastructure/engine'

/**
 * Record a validator's decision on a milestone.
 *
 * Body: { validatorCode: string, decision?: 'APPROVED' | 'REJECTED', note?: string }
 *
 * All the real decisions - is this caller allowed, is the validator eligible,
 * is the milestone in a state that accepts a decision - are made inside
 * completeValidation() against the database, not here. This route only
 * translates the HTTP request into that call and its result back into JSON.
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

  let body: { validatorCode?: string; decision?: string; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  if (!body.validatorCode || typeof body.validatorCode !== 'string') {
    return NextResponse.json({ error: 'validatorCode is required.' }, { status: 400 })
  }
  const decision = body.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED'

  try {
    const result = await completeValidation({
      projectId,
      milestoneId,
      validatorCode: body.validatorCode,
      decision,
      note: typeof body.note === 'string' ? body.note : undefined,
      actor: user,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof InfrastructureError) {
      const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 409
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status })
    }
    return NextResponse.json({ ok: false, error: 'Validation could not be recorded.' }, { status: 500 })
  }
}
