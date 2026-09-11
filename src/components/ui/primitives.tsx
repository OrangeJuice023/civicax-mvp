import type { ReactNode } from 'react'
import { Inbox, AlertOctagon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ProvenanceBadge } from './provenance'
import type { DataClassification } from '@/lib/domain/constants'

/**
 * Layout and content primitives.
 *
 * Every screen composes these so spacing, borders and type scale stay
 * consistent without each page re-deciding them. Hairline borders and flat
 * surfaces are intentional: this is an administrative tool, so structure comes
 * from alignment and density rather than shadows or colour.
 */

// ---------------------------------------------------------------- card

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-hairline bg-surface-1',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  description,
  actions,
  classification,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  classification?: DataClassification
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
          {classification && <ProvenanceBadge classification={classification} />}
        </div>
        {description && (
          <p className="max-w-prose text-xs text-ink-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export function CardBody({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return <div className={cn(padded && 'p-4', className)}>{children}</div>
}

// ---------------------------------------------------------------- page header

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="max-w-prose text-sm text-ink-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

// ---------------------------------------------------------------- stat tile

/**
 * A single headline figure.
 *
 * Used instead of a chart when the data's job is to report one number - an SLA
 * compliance rate, a case count. A one-value bar chart is strictly worse than
 * the number itself, so this exists to make the right choice the easy one.
 *
 * `hint` carries the honest qualification (sample size, what the denominator
 * is), because a bare percentage invites over-reading.
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  tone = 'default',
  className,
}: {
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  tone?: 'default' | 'good' | 'warning' | 'critical'
  className?: string
}) {
  const valueTone = {
    default: 'text-ink',
    good: 'text-ink',
    warning: 'text-ink',
    critical: 'text-ink',
  }[tone]

  const accentBar = {
    default: 'bg-hairline-strong',
    good: 'bg-good',
    warning: 'bg-warning',
    critical: 'bg-critical',
  }[tone]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-hairline bg-surface-1 p-4',
        className,
      )}
    >
      {/* A thin rule rather than a coloured panel: tone is a hint here, and the
          text must stay the primary carrier of meaning. */}
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-0.5', accentBar)} />
      <dt className="text-xs font-medium tracking-wide text-ink-secondary uppercase">
        {label}
      </dt>
      <dd className="mt-2 flex items-baseline gap-1.5">
        <span className={cn('ca-numeric text-2xl font-semibold tracking-tight', valueTone)}>
          {value}
        </span>
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </dd>
      {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

export function StatGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </dl>
  )
}

// ---------------------------------------------------------------- field

/** A labelled read-only value, for detail panels. */
export function Field({
  label,
  children,
  className,
  numeric = false,
}: {
  label: string
  children: ReactNode
  className?: string
  numeric?: boolean
}) {
  return (
    <div className={cn('space-y-0.5', className)}>
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={cn('text-sm text-ink', numeric && 'ca-numeric')}>{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------- states

/**
 * Empty, error and loading states are first-class screens here, not
 * afterthoughts. An administrative tool spends real time in all three, and a
 * blank panel is indistinguishable from a broken one.
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: typeof Inbox
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <Icon aria-hidden className="size-8 text-ink-muted" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-ink-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  action,
  className,
}: {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <AlertOctagon aria-hidden className="size-8 text-critical" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-ink-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function LoadingState({
  label = 'Loading',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2 px-6 py-12', className)}
      aria-live="polite"
      aria-busy
    >
      <Loader2 aria-hidden className="size-4 animate-spin text-ink-muted" />
      <span className="text-sm text-ink-secondary">{label}</span>
    </div>
  )
}

/** Non-interactive skeleton block, for streaming server components. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded bg-surface-3', className)}
    />
  )
}

// ---------------------------------------------------------------- table shell

/**
 * Wraps a table so it scrolls inside its own container. Administrative tables
 * are wide by nature; the page body must never scroll sideways.
 */
export function TableShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('ca-scroll-x', className)}>
      <table className="w-full min-w-[48rem] border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({
  children,
  className,
  numeric = false,
}: {
  children: ReactNode
  className?: string
  numeric?: boolean
}) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-hairline px-3 py-2 text-left text-xs font-medium tracking-wide text-ink-secondary uppercase',
        numeric && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  numeric = false,
}: {
  children: ReactNode
  className?: string
  numeric?: boolean
}) {
  return (
    <td
      className={cn(
        'border-b border-hairline px-3 py-2 align-middle text-ink',
        numeric && 'ca-numeric text-right',
        className,
      )}
    >
      {children}
    </td>
  )
}
