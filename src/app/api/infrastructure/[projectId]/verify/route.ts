import { NextResponse } from 'next/server'
import { verifyProjectAuditChain } from '@/lib/audit'
import { readSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/policy'

/**
 * Recompute and check one project's audit chain on demand.
 *
 * `projectId` in the route is the internal Project.id (a cuid), matching
 * CaseEvent.projectId / AuditRecord.projectId - NOT the human-readable
 * Project.projectId field (e.g. "PRJ-00026"). Callers get this value from a
 * CaseEvent/AuditRecord row they already have (see the audit ledger page),
 * or from Project.id on a project they queried directly.
 *
 * Gated on 'audit:verify', same as the audit ledger page itself - checked
 * again here because a route handler is a real trust boundary regardless of
 * what the page that links to it already enforced.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  const user = await readSession()
  const decision = can(user, 'audit:verify')
  if (!decision.allowed) {
    return NextResponse.json(
      { valid: false, recordCount: 0, brokenAtSequence: null, reason: decision.reason, checkedAt: new Date().toISOString() },
      { status: user ? 403 : 401 },
    )
  }

  try {
    const result = await verifyProjectAuditChain(projectId)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { valid: false, recordCount: 0, brokenAtSequence: null, reason: String(error), checkedAt: new Date().toISOString() },
      { status: 500 },
    )
  }
}
