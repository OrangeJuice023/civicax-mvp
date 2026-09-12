import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * The lifecycle chain: Project -> Milestone -> Evidence -> Validation ->
 * Status -> Audit, rendered as connected steps.
 *
 * This is the product's central claim made visible - a reader should be able
 * to see, in one line, where a project is and what the next link in the chain
 * is waiting for. Deliberately a LINE, not a node graph: an oversight officer
 * needs to read it at a glance in a table row, and a force-directed diagram of
 * eighteen projects would be decoration, not information.
 *
 * Every value shown is passed in from database-derived state; this component
 * computes nothing.
 */

export type LifecycleTone = 'done' | 'active' | 'blocked' | 'idle'

export type LifecycleStep = {
  label: string
  value: string
  tone?: LifecycleTone
}

const TONE_CLASSES: Record<LifecycleTone, string> = {
  done: 'border-good/40 bg-good-subtle text-ink',
  active: 'border-accent/40 bg-accent-subtle text-ink',
  blocked: 'border-critical/50 bg-critical-subtle text-ink',
  idle: 'border-hairline bg-surface-2 text-ink-secondary',
}

export function LifecycleChain({
  steps,
  className,
}: {
  steps: readonly LifecycleStep[]
  className?: string
}) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-x-1 gap-y-1.5', className)}>
      {steps.map((step, i) => (
        <li key={`${step.label}-${i}`} className="flex items-center gap-1">
          <span
            className={cn(
              'inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-none',
              TONE_CLASSES[step.tone ?? 'idle'],
            )}
          >
            <span className="font-medium uppercase tracking-wide opacity-70">{step.label}</span>
            <span className="font-semibold">{step.value}</span>
          </span>
          {i < steps.length - 1 && (
            <ChevronRight aria-hidden className="size-3 shrink-0 text-brand-neutral" />
          )}
        </li>
      ))}
    </ol>
  )
}
