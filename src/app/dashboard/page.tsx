import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import { readSession } from '@/lib/auth/session'
import { Card, CardHeader } from '@/components/ui/primitives'
import { StatusPill } from '@/components/ui/status'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { AppShell } from '@/components/AppShell'
import { formatPeso, formatPercent, infrastructureEventLabel, projectStatusLabel } from '@/lib/infrastructure/labels'
import {
  getAuditIntegritySummary,
  getBudgetByCategory,
  getDashboardKpis,
  getLatestProjectEvents,
  getNeedsAttention,
  getPendingActionsCount,
  getProjectsAtAGlance,
  getValidationHealth,
  type AttentionKind,
} from '@/lib/infrastructure/queries'
import { FeaturedProject, ProjectGlanceRow } from './glance'

export const metadata: Metadata = { title: 'Dashboard' }

/** How many projects the "at a glance" panel shows before deferring to /projects. */
const GLANCE_COUNT = 5

const ATTENTION_LABELS: Record<AttentionKind, string> = {
  BLOCKED_VALIDATION: 'Blocked on validation',
  BLOCKED_EVIDENCE: 'Blocked on evidence',
  AWAITING_APPROVAL: 'Ready for approval',
  DELAYED: 'Delayed',
}

/** Maps an attention reason onto the status vocabulary StatusPill already tones. */
const ATTENTION_STATUS: Record<AttentionKind, string> = {
  BLOCKED_VALIDATION: 'BLOCKED_ON_VALIDATION',
  BLOCKED_EVIDENCE: 'BLOCKED_ON_EVIDENCE',
  AWAITING_APPROVAL: 'PENDING_APPROVAL',
  DELAYED: 'DELAYED',
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  icon: typeof Building2
  tone?: 'default' | 'critical'
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={
            tone === 'critical'
              ? 'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-critical-subtle text-critical'
              : 'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-ink'
          }
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</div>
          <div className="ca-numeric mt-0.5 text-xl font-semibold leading-none text-ink">{value}</div>
          {hint && <div className="mt-1 truncate text-[10px] text-muted">{hint}</div>}
        </div>
      </div>
    </Card>
  )
}

export default async function DashboardPage() {
  const user = await readSession()

  const [kpis, glance, attention, events, health, audit, budget, pendingActionsCount] = await Promise.all([
    getDashboardKpis(),
    getProjectsAtAGlance(),
    getNeedsAttention(5),
    getLatestProjectEvents(6),
    getValidationHealth(),
    getAuditIntegritySummary(),
    getBudgetByCategory(),
    getPendingActionsCount(),
  ])

  // The featured project is whichever one most needs a person right now -
  // ranked in the query, never pinned to a hard-coded project id.
  const featured = glance[0]
  const rest = glance.slice(1, GLANCE_COUNT)
  const agreement = health.decided > 0 ? Math.round((health.approved / health.decided) * 100) : null

  return (
    <AppShell user={user} active="dashboard" pendingActionsCount={pendingActionsCount}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted">See how systems connect.</p>
        </div>
        <Link
          href="/audit"
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[11px] font-medium text-ink-secondary hover:bg-surface-2 hover:text-ink"
        >
          <ShieldAlert aria-hidden className="size-3.5 text-brand-teal" />
          <span className="ca-numeric">
            {audit.verifiedProjects}/{audit.totalProjects}
          </span>
          project chains verified
          <ArrowRight aria-hidden className="size-3" />
        </Link>
      </div>

      {/* KPIs - every figure counted in src/lib/infrastructure/queries.ts, none written here. */}
      <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Projects" value={String(kpis.projects)} icon={Building2} hint="Under monitoring" />
        <Kpi
          label="At risk"
          value={String(kpis.projectsAtRisk)}
          icon={AlertTriangle}
          tone={kpis.projectsAtRisk > 0 ? 'critical' : 'default'}
          hint="Blocked or delayed"
        />
        <Kpi label="Pending approvals" value={String(kpis.pendingApprovals)} icon={Clock} hint="Milestones" />
        <Kpi
          label="Completed milestones"
          value={String(kpis.completedMilestones)}
          icon={CheckCircle2}
          hint="Across the portfolio"
        />
        <Kpi
          label="Validating nodes"
          value={`${kpis.activeValidators} / ${kpis.totalValidators}`}
          icon={Users}
          hint="Active validators"
        />
        <Kpi
          label="Blocked"
          value={String(kpis.blockedMilestones)}
          icon={ShieldAlert}
          tone={kpis.blockedMilestones > 0 ? 'critical' : 'default'}
          hint="Milestones held open"
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Projects at a Glance"
              description="See how projects move through connected workflows."
              actions={
                <Link href="/projects" className="text-xs font-medium text-accent hover:underline">
                  View all {kpis.projects} projects →
                </Link>
              }
            />
            {featured ? (
              <>
                <div className="p-4">
                  <FeaturedProject project={featured} />
                </div>
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {rest.map((project) => (
                    <ProjectGlanceRow key={project.projectId} project={project} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="px-4 py-8 text-sm text-muted">No projects are being monitored yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Needs attention"
              description="Blocked, awaiting approval, or behind schedule."
              actions={
                <Link href="/pending-actions" className="text-xs font-medium text-accent hover:underline">
                  All actions →
                </Link>
              }
            />
            {attention.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">Nothing is waiting on anyone right now.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {attention.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={`/projects/${item.projectId}`}
                      className="block px-4 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink">{item.projectName}</div>
                          {item.milestoneName && (
                            <div className="truncate text-[11px] text-muted">{item.milestoneName}</div>
                          )}
                          <div className="mt-0.5 truncate text-[11px] text-ink-secondary">{item.detail}</div>
                        </div>
                        <StatusPill status={ATTENTION_STATUS[item.kind]} label={ATTENTION_LABELS[item.kind]} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Validation health"
              description="Prototype validation activity, not a production consensus network."
              actions={
                <Link href="/validators" className="text-xs font-medium text-accent hover:underline">
                  Validators →
                </Link>
              }
            />
            <div className="space-y-3 p-4">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-ink-secondary">Active validators</span>
                  <span className="ca-numeric text-sm font-semibold text-ink">
                    {health.activeValidators} / {health.totalValidators}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-brand-teal"
                    style={{
                      width: `${health.totalValidators ? (health.activeValidators / health.totalValidators) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              {agreement !== null && (
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-secondary">Validator agreement</span>
                  <span className="ca-numeric font-semibold text-ink">
                    {health.approved} / {health.decided} ({formatPercent(agreement)})
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-secondary">Awaiting a decision</span>
                <span className="ca-numeric font-semibold text-ink">{health.pending}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-muted">
                Validators are named review roles - engineering, finance, oversight, independent - recorded in the
                database. Agreement counts approved decisions out of decisions actually recorded.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Recent audit activity"
              description="The latest entries on the tamper-evident ledger."
              actions={
                <Link href="/audit" className="text-xs font-medium text-accent hover:underline">
                  View audit ledger →
                </Link>
              }
            />
            {events.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No audit events recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-[10px] font-medium uppercase tracking-wide text-muted">
                      <th className="px-4 py-2">Seq</th>
                      <th className="px-4 py-2">Project</th>
                      <th className="px-4 py-2">Event</th>
                      <th className="px-4 py-2">Actor</th>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                        <td className="ca-numeric px-4 py-2 text-ink">{e.sequence}</td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/projects/${e.projectId}`}
                            className="ca-numeric text-xs font-medium text-ink hover:underline"
                          >
                            {e.projectId}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-xs text-ink-secondary">{infrastructureEventLabel(e.type)}</td>
                        <td className="px-4 py-2 text-xs text-muted">{e.actorLabel ?? e.actorRole ?? '—'}</td>
                        <td className="px-4 py-2 text-xs text-muted">
                          {new Date(e.occurredAt).toLocaleDateString()}
                        </td>
                        <td className="ca-numeric px-4 py-2 text-[11px] text-ink-secondary">
                          {(e.hash ?? '').slice(0, 10)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <footer className="border-t border-hairline px-4 py-2 text-[10px] text-muted">
              {audit.totalRecords} chained records across {audit.totalProjects} projects · recomputed on this
              request, never cached.
            </footer>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Budget distribution" description="Summed from the seeded project budgets." />
            <div className="space-y-3 p-4">
              {budget.rows.map((row) => {
                const pct = budget.total ? Math.round((row.total / budget.total) * 100) : 0
                return (
                  <div key={row.category} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-ink-secondary">{row.category.replace(/_/g, ' ')}</span>
                      <span className="ca-numeric text-ink">
                        {formatPeso(row.total)} <span className="text-muted">({formatPercent(pct)})</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="flex items-baseline justify-between border-t border-hairline pt-2 text-xs">
                <span className="font-medium text-ink">Total portfolio</span>
                <span className="ca-numeric font-semibold text-ink">{formatPeso(budget.total)}</span>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Project status" description="Where the rest of the portfolio stands." />
            <ul className="divide-y divide-hairline">
              {glance.slice(GLANCE_COUNT, GLANCE_COUNT + 6).map((project) => (
                <li key={project.projectId}>
                  <Link
                    href={`/projects/${project.projectId}`}
                    className="flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-ink">{project.name}</span>
                      <span className="ca-numeric block truncate text-[10px] text-muted">
                        {project.projectId} · {formatPercent(project.progress)}
                      </span>
                    </span>
                    <StatusPill status={project.status} label={projectStatusLabel(project.status)} />
                  </Link>
                </li>
              ))}
            </ul>
            <footer className="border-t border-hairline px-4 py-2">
              <Link href="/projects" className="text-[11px] font-medium text-accent hover:underline">
                View all projects →
              </Link>
            </footer>
          </Card>
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-1 pt-3 text-[10px] text-muted">
        <span>
          Synthetic demonstration data · {kpis.projects} projects · {kpis.totalValidators} validators · every figure
          derived from the seeded database
        </span>
        <ProvenanceBadge classification="SYNTHETIC_DEMO" />
      </footer>
    </AppShell>
  )
}
