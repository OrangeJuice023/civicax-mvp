import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/policy'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const region = searchParams.get('region')

  const user = await readSession()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const decision = can(user, 'project:read')
  if (!decision.allowed) return NextResponse.json({ error: decision.reason ?? 'Forbidden' }, { status: 403 })

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (category) where.category = category
  if (region) where.region = region

  const projects = await db.project.findMany({
    where,
    include: {
      office: { select: { id: true, code: true, name: true, shortName: true } },
      milestones: { orderBy: { sequence: 'asc' }, include: { _count: { select: { evidence: true, validations: true } } } },
    },
    orderBy: { projectId: 'asc' },
  })

  return NextResponse.json({ projects })
}