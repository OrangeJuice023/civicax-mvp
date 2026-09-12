import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { Card, CardHeader } from '@/components/ui/primitives'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { DashboardShell } from '../dashboard/DashboardShell'
import { ValidatorsTable, type ValidatorRow } from './ValidatorsTable'

export const metadata: Metadata = { title: 'Validators' }

export default async function ValidatorsPage() {
  const [user, validators, pendingActionsCount] = await Promise.all([
    readSession(),
    db.validator.findMany({
      include: {
        _count: { select: { validations: true } },
        validations: {
          where: { status: { not: 'PENDING' } },
          orderBy: { validatedAt: 'desc' },
          take: 5,
          include: { milestone: { select: { name: true, project: { select: { projectId: true, name: true } } } } },
        },
      },
      orderBy: { code: 'asc' },
    }),
    getPendingActionsCount(),
  ])

  const active = validators.filter((v) => v.status === 'ACTIVE').length
  const inactive = validators.filter((v) => v.status !== 'ACTIVE').length

  const rows: ValidatorRow[] = validators.map((v) => ({
    id: v.id,
    code: v.code,
    name: v.name,
    department: v.department,
    role: v.role,
    status: v.status,
    lastActivity: v.lastActivity ? v.lastActivity.toISOString() : null,
    validationCount: v._count.validations,
    recentValidations: v.validations.map((rv) => ({
      id: rv.id,
      status: rv.status,
      validatedAt: rv.validatedAt ? rv.validatedAt.toISOString() : null,
      milestoneName: rv.milestone.name,
      projectId: rv.milestone.project.projectId,
      projectName: rv.milestone.project.name,
    })),
  }))

  return (
    <DashboardShell user={user} active="validators" pendingActionsCount={pendingActionsCount}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Total</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{validators.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Active</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{active}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Inactive</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{inactive}</div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader
          title="Validation roster"
          description="Synthetic validator roster - named review roles, not a distributed consensus network. Click a row for recent activity."
          actions={<ProvenanceBadge classification="SYNTHETIC_DEMO" />}
        />
        <ValidatorsTable rows={rows} />
      </Card>
    </DashboardShell>
  )
}
