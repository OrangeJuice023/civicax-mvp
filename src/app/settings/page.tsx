import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { Card, CardHeader } from '@/components/ui/primitives'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { ROLE_LABELS } from '@/lib/domain/constants'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { DashboardShell } from '../dashboard/DashboardShell'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const [user, projectCount, validatorCount, milestoneCount, evidenceCount, pendingActionsCount] = await Promise.all([
    readSession(),
    db.project.count(),
    db.validator.count(),
    db.milestone.count(),
    db.evidence.count(),
    getPendingActionsCount(),
  ])

  return (
    <DashboardShell user={user} active="settings" pendingActionsCount={pendingActionsCount}>
      <Card>
        <CardHeader title="Session" description="The identity this browser is currently signed in as." />
        <div className="space-y-3 p-4 text-sm">
          {user ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted">Name</span>
                <span className="font-medium text-ink">{user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Role</span>
                <span className="font-medium text-ink">{ROLE_LABELS[user.role]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Office</span>
                <span className="font-medium text-ink">{user.officeName ?? '—'}</span>
              </div>
            </>
          ) : (
            <p className="text-muted">Not signed in.</p>
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Database" description="Synthetic demo configuration." actions={<ProvenanceBadge classification="SYNTHETIC_DEMO" />} />
        <div className="space-y-3 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Projects</span>
            <span className="ca-numeric font-medium text-ink">{projectCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Validators</span>
            <span className="ca-numeric font-medium text-ink">{validatorCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Milestones</span>
            <span className="ca-numeric font-medium text-ink">{milestoneCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Evidence records</span>
            <span className="ca-numeric font-medium text-ink">{evidenceCount}</span>
          </div>
        </div>
      </Card>
      <p className="mt-3 text-[11px] text-muted">
        All data is synthetic demonstration data. Re-seed with <code className="rounded bg-surface-2 px-1">npx prisma db seed</code>.
      </p>
    </DashboardShell>
  )
}
