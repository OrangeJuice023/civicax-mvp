import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { StatusPill } from '@/components/ui/status'
import { ProjectArt } from '@/components/ui/project-art'
import { LifecycleChain, type LifecycleStep } from '@/components/ui/lifecycle'
import {
  formatPeso,
  formatPercent,
  formatPercentPrecise,
  isMilestoneBlocked,
  milestoneStatusLabel,
  projectStatusLabel,
} from '@/lib/infrastructure/labels'
import type { ProjectGlance } from '@/lib/infrastructure/queries'

/**
 * "Projects at a Glance" - the dashboard's centrepiece.
 *
 * Two densities of the same record: one featured project rendered large
 * (whichever project most needs a human right now, chosen in the query, not
 * hard-coded), and the rest as compact rows. Both show the same lifecycle
 * chain, so moving between them is reading the same thing at two zoom levels.
 */

function chainSteps(p: ProjectGlance): LifecycleStep[] {
  const milestone = p.currentMilestone
  const blocked = milestone ? isMilestoneBlocked(milestone.status) : false
  const evidenceComplete = p.evidenceTotal > 0 && p.evidenceVerified === p.evidenceTotal
  const validationComplete = p.validationsRequired > 0 && p.validationsApproved === p.validationsRequired

  return [
    {
      label: 'Milestone',
      value: milestone?.name ?? 'No active milestone',
      tone: blocked ? 'blocked' : 'active',
    },
    {
      label: 'Evidence',
      value: p.evidenceTotal > 0 ? `${p.evidenceVerified}/${p.evidenceTotal}` : '—',
      tone: evidenceComplete ? 'done' : 'idle',
    },
    {
      label: 'Validation',
      value: p.validationsRequired > 0 ? `${p.validationsApproved}/${p.validationsRequired}` : '—',
      tone: validationComplete ? 'done' : blocked ? 'blocked' : 'idle',
    },
    {
      label: 'Status',
      value: milestone ? milestoneStatusLabel(milestone.status) : projectStatusLabel(p.status),
      tone: blocked ? 'blocked' : validationComplete ? 'done' : 'idle',
    },
  ]
}

function DisbursedLine({ project }: { project: ProjectGlance }) {
  const pct = project.budget ? (project.fundsDisbursed / project.budget) * 100 : 0
  return (
    <span className="ca-numeric">
      {formatPeso(project.fundsDisbursed)} <span className="text-muted">of</span> {formatPeso(project.budget)}{' '}
      <span className="text-muted">({formatPercentPrecise(pct)} disbursed)</span>
    </span>
  )
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-3 ${className ?? ''}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-navy via-brand-blue to-brand-teal transition-[width] duration-500"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

export function FeaturedProject({ project }: { project: ProjectGlance }) {
  const needsAttention = project.attentionRank <= 1
  return (
    <article className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
        <ProjectArt
          category={project.category}
          sector={project.sector}
          className="h-28 w-full sm:h-full"
        />
        <div className="min-w-0 space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ca-numeric text-[11px] font-medium text-muted">{project.projectId}</span>
                <StatusPill status={project.status} label={projectStatusLabel(project.status)} />
                {needsAttention && (
                  <span className="rounded border border-critical/50 bg-critical-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
                    Needs attention
                  </span>
                )}
              </div>
              <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-ink">
                <Link href={`/projects/${project.projectId}`} className="hover:underline">
                  {project.name}
                </Link>
              </h3>
              <p className="text-[11px] text-muted">
                {project.category.replace(/_/g, ' ')} · {project.sector} · {project.city}
              </p>
            </div>
            <div className="text-right">
              <div className="ca-numeric text-2xl font-semibold leading-none text-ink">
                {formatPercent(project.progress)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted">complete</div>
            </div>
          </div>

          <ProgressBar value={project.progress} />

          <LifecycleChain steps={chainSteps(project)} />

          {project.nextValidator && (
            <p className="text-xs text-ink-secondary">
              <span className="font-medium text-ink">Next: </span>
              {project.nextValidator}
            </p>
          )}
          {!project.nextValidator && project.delayedReason && (
            <p className="text-xs text-ink-secondary">
              <span className="font-medium text-ink">Delay: </span>
              {project.delayedReason}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 text-xs">
            <DisbursedLine project={project} />
            <Link
              href={`/projects/${project.projectId}`}
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              Open project <ArrowRight aria-hidden className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ProjectGlanceRow({ project }: { project: ProjectGlance }) {
  const milestone = project.currentMilestone
  return (
    <li>
      <Link
        href={`/projects/${project.projectId}`}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
      >
        <ProjectArt
          category={project.category}
          sector={project.sector}
          className="h-12 w-16 shrink-0 rounded border border-hairline"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{project.name}</div>
              <div className="ca-numeric text-[11px] text-muted">
                {project.projectId} · {milestone ? milestone.name : 'No active milestone'}
              </div>
            </div>
            <StatusPill
              status={milestone?.status ?? project.status}
              label={milestone ? milestoneStatusLabel(milestone.status) : projectStatusLabel(project.status)}
            />
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar value={project.progress} className="max-w-48" />
            <span className="ca-numeric text-[11px] font-medium text-ink">{formatPercent(project.progress)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="ca-numeric">
              {formatPeso(project.fundsDisbursed)} / {formatPeso(project.budget)}
            </span>
            {project.validationsRequired > 0 && (
              <span>
                Validation{' '}
                <span className="ca-numeric font-medium text-ink-secondary">
                  {project.validationsApproved}/{project.validationsRequired}
                </span>
              </span>
            )}
            {project.nextValidator && <span>Awaiting {project.nextValidator}</span>}
          </div>
        </div>
      </Link>
    </li>
  )
}
