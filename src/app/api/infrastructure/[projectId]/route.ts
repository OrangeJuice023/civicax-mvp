import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { can, type ProjectResource } from '@/lib/auth/policy'

function projectResource(project: { officeId: string | null }): ProjectResource {
  return { kind: 'project', officeId: project.officeId, contractorOfficeId: null }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const user = await readSession()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const project = await db.project.findUnique({
    where: { projectId },
    include: {
      office: { select: { id: true, code: true, name: true, shortName: true } },
      milestones: {
        orderBy: { sequence: 'asc' },
        include: {
          evidence: true,
          validations: { include: { validator: { select: { id: true, code: true, name: true, department: true, role: true, status: true } } } },
        },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const decision = can(user, 'project:read-internal', projectResource(project))
  if (decision.allowed) {
    return NextResponse.json({ project, internal: true })
  }

  const publicDecision = can(user, 'project:read', projectResource(project))
  if (!publicDecision.allowed) {
    return NextResponse.json({ error: publicDecision.reason ?? 'Forbidden' }, { status: 403 })
  }

  const publicProject = {
    ...project,
    milestones: project.milestones.map((milestone) => ({
      ...milestone,
      validations: milestone.validations.map((validation) => ({
        id: validation.id,
        milestoneId: validation.milestoneId,
        department: validation.department,
        role: validation.role,
        status: validation.status,
        validatedAt: validation.validatedAt,
        createdAt: validation.createdAt,
        validator: { code: validation.validator.code, name: validation.validator.name, department: validation.validator.department, status: validation.validator.status },
        note: null,
      })),
    })),
  }

  return NextResponse.json({ project: publicProject, internal: false })
}