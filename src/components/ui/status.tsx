import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RotateCcw,
  CircleDashed,
  Ban,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CaseStatus } from '@/lib/domain/constants'
import type { SlaState } from '@/lib/domain/sla'

/**
 * Status indicators.
 *
 * One rule governs every component in this file: a status is NEVER communicated
 * by colour alone. Each pill renders an icon AND a text label alongside the
 * colour, because two of the four status colours sit below 3:1 contrast on the
 * light surface by design, and because colour-blind and monochrome readers must
 * get the same information. There is intentionally no icon-only variant.
 */

type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'accent'

const TONE_CLASSES: Record<Tone, string> = {
  good: 'border-good bg-good-subtle text-ink',
  warning: 'border-warning bg-warning-subtle text-ink',
  serious: 'border-serious bg-serious-subtle text-ink',
  critical: 'border-critical bg-critical-subtle text-ink',
  neutral: 'border-hairline bg-surface-2 text-ink-secondary',
  accent: 'border-accent bg-accent-subtle text-ink',
}

function Pill({
  tone,
  icon: Icon,
  label,
  title,
  className,
}: {
  tone: Tone
  icon: typeof CheckCircle2
  label: string
  title?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
      title={title}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------- SLA

const SLA_PRESENTATION: Record<
  SlaState,
  { tone: Tone; icon: typeof CheckCircle2; label: string; title: string }
> = {
  ON_TIME: {
    tone: 'good',
    icon: CheckCircle2,
    label: 'Within deadline',
    title:
      'Inside the statutory processing period under RA 11032 Sec. 9, computed in working days.',
  },
  AT_RISK: {
    tone: 'warning',
    icon: Clock,
    label: 'At risk',
    title:
      'CivicaX prototype heuristic: little of the statutory period remains. "At risk" is not a concept defined by the statute.',
  },
  BREACHED: {
    tone: 'critical',
    icon: AlertTriangle,
    label: 'Past deadline',
    title:
      'The statutory processing period under RA 11032 Sec. 9 has elapsed for this transaction.',
  },
  UNKNOWN: {
    tone: 'neutral',
    icon: HelpCircle,
    label: 'No deadline set',
    title:
      'This service has no recognised RA 11032 classification, so no statutory deadline was computed. CivicaX does not guess one.',
  },
}

export function SlaPill({
  state,
  className,
}: {
  state: SlaState
  className?: string
}) {
  const p = SLA_PRESENTATION[state]
  return (
    <Pill
      tone={p.tone}
      icon={p.icon}
      label={p.label}
      title={p.title}
      className={className}
    />
  )
}

// ---------------------------------------------------------------- case status

const CASE_STATUS_PRESENTATION: Record<
  CaseStatus,
  { tone: Tone; icon: typeof CheckCircle2; label: string }
> = {
  ACTIVE: { tone: 'accent', icon: CircleDashed, label: 'In progress' },
  RETURNED: { tone: 'warning', icon: RotateCcw, label: 'Returned' },
  COMPLETED: { tone: 'good', icon: CheckCircle2, label: 'Completed' },
  REJECTED: { tone: 'critical', icon: XCircle, label: 'Rejected' },
  CANCELLED: { tone: 'neutral', icon: Ban, label: 'Cancelled' },
}

export function CaseStatusPill({
  status,
  className,
}: {
  status: CaseStatus
  className?: string
}) {
  const p = CASE_STATUS_PRESENTATION[status] ?? {
    tone: 'neutral' as Tone,
    icon: HelpCircle,
    label: status,
  }
  return <Pill tone={p.tone} icon={p.icon} label={p.label} className={className} />
}

// ---------------------------------------------------------------- generic status

/**
 * A generic status pill for domain vocabularies that do not have a dedicated
 * component - project lifecycle, milestone lifecycle, evidence, validation.
 *
 * The tone is derived from the status string rather than a fixed map, so a
 * new vocabulary value still renders something reasonable instead of
 * crashing. Known values keep their intended tone; unknown values fall back
 * to neutral and still carry a text label, which is what the accessibility
 * rule requires.
 */
const GENERIC_STATUS_TONES: Record<string, Tone> = {
  COMPLETED: 'good',
  APPROVED: 'good',
  VERIFIED: 'good',
  PAYMENT_ELIGIBLE: 'good',
  PAYMENT_RELEASED: 'good',
  ACTIVE: 'accent',
  SUBMITTED: 'accent',
  READY_FOR_APPROVAL: 'accent',
  PENDING: 'neutral',
  DRAFT: 'neutral',
  MISSING: 'neutral',
  PLANNING: 'neutral',
  RETURNED: 'warning',
  REJECTED: 'critical',
  BLOCKED: 'critical',
  DELAYED: 'critical',
  ON_HOLD: 'warning',
  UNDER_REVIEW: 'warning',
  ELEVATED: 'serious',
  ESCALATED: 'critical',
  INACTIVE: 'neutral',
  SUSPENDED: 'warning',
  CANCELLED: 'neutral',
}

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string
  label: string
  className?: string
}) {
  const tone = GENERIC_STATUS_TONES[status] ?? 'neutral'
  const icon = tone === 'good' ? CheckCircle2
    : tone === 'critical' ? AlertTriangle
    : tone === 'warning' || tone === 'serious' ? Clock
    : tone === 'accent' ? CircleDashed
    : Ban
  return <Pill tone={tone} icon={icon} label={label} className={className} />
}

// ---------------------------------------------------------------- bottlenecks

export type BottleneckSeverity = 'NONE' | 'ELEVATED' | 'HIGH'

const SEVERITY_PRESENTATION: Record<
  BottleneckSeverity,
  { tone: Tone; icon: typeof CheckCircle2; label: string }
> = {
  NONE: { tone: 'neutral', icon: CheckCircle2, label: 'Within target' },
  ELEVATED: { tone: 'serious', icon: Clock, label: 'Elevated wait' },
  HIGH: { tone: 'critical', icon: AlertTriangle, label: 'High wait' },
}

/**
 * Severity is measured against a CONFIGURED target, not a statutory one, and is
 * suppressed entirely below the analytics module's minimum sample size. The
 * sample size travels with the badge so a reader can see how much evidence sits
 * behind the label.
 */
export function SeverityPill({
  severity,
  sampleSize,
  className,
}: {
  severity: BottleneckSeverity
  sampleSize?: number
  className?: string
}) {
  const p = SEVERITY_PRESENTATION[severity] ?? SEVERITY_PRESENTATION.NONE
  const title =
    sampleSize === undefined
      ? 'Compared against a CivicaX configured target, not a statutory one.'
      : `Based on ${sampleSize} observed case${sampleSize === 1 ? '' : 's'}, compared against a CivicaX configured target. No claim of statistical significance.`
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Pill tone={p.tone} icon={p.icon} label={p.label} title={title} />
      {sampleSize !== undefined && (
        <span className="ca-numeric text-xs text-ink-muted" title={title}>
          n={sampleSize}
        </span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------- AI confidence

/**
 * Renders an agent's confidence as an explicit, bounded figure.
 *
 * Confidence in CivicaX is rule-derived: a required document that is absent from
 * the database is a certainty, not a 94% guess. This component shows the number
 * next to the basis for it so the reader can judge the claim rather than trust
 * a bar.
 */
export function ConfidenceMeter({
  confidence,
  basis,
  className,
}: {
  confidence: number
  basis?: string
  className?: string
}) {
  const pct = Math.round(Math.min(Math.max(confidence, 0), 1) * 100)
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-secondary">Confidence</span>
        <span className="ca-numeric text-sm font-semibold text-ink">{pct}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Agent confidence"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      {basis && <p className="text-xs text-ink-muted">{basis}</p>}
    </div>
  )
}
