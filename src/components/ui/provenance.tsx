import { Database, FlaskConical, Sigma, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  DATA_CLASSIFICATION_LABELS,
  type DataClassification,
} from '@/lib/domain/constants'

/**
 * Provenance labelling.
 *
 * This is a correctness feature, not decoration. CivicaX shows synthetic
 * demonstration transactions next to genuinely sourced reference data, and a
 * viewer must never be able to mistake one for the other. Every surface that
 * renders numbers is expected to carry one of these.
 *
 * The rule the components enforce:
 *   SYNTHETIC_DEMO  - fabricated. Never presentable as government statistics.
 *   OFFICIAL_SOURCE - traceable to a named statute or published dataset.
 *   CIVICAX_DERIVED - computed by CivicaX; inherits the provenance of its least
 *                     authoritative input, so a metric over synthetic cases is
 *                     labelled derived, not official.
 */

const CLASSIFICATION_STYLES: Record<
  DataClassification,
  { icon: typeof Database; className: string; title: string }
> = {
  SYNTHETIC_DEMO: {
    icon: FlaskConical,
    className: 'bg-warning-subtle text-ink border-warning',
    title:
      'Fabricated demonstration data. Not real government transactions and not official statistics.',
  },
  OFFICIAL_SOURCE: {
    icon: Database,
    className: 'bg-good-subtle text-ink border-good',
    title: 'Traceable to a named public source or statute. See the Data Sources page.',
  },
  CIVICAX_DERIVED: {
    icon: Sigma,
    className: 'bg-accent-subtle text-ink border-accent',
    title:
      'A CivicaX prototype metric, computed by this application. Not an official government measure.',
  },
}

export function ProvenanceBadge({
  classification,
  className,
  showLabel = true,
}: {
  classification: DataClassification
  className?: string
  showLabel?: boolean
}) {
  const style = CLASSIFICATION_STYLES[classification]
  const Icon = style.icon
  const label = DATA_CLASSIFICATION_LABELS[classification]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium',
        style.className,
        className,
      )}
      title={style.title}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {/* The icon never carries the meaning on its own - the text label is the
          accessible name whenever it is hidden visually. */}
      <span className={showLabel ? undefined : 'sr-only'}>{label}</span>
    </span>
  )
}

/**
 * A page-level banner for any screen whose primary content is synthetic.
 *
 * Deliberately persistent and non-dismissible: a viewer arriving mid-demo, or
 * looking at a screenshot of a dashboard, must still see the disclaimer.
 */
export function SyntheticDataBanner({
  className,
  detail,
}: {
  className?: string
  detail?: string
}) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded border border-warning bg-warning-subtle px-3 py-2.5 text-sm',
        className,
      )}
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
      <div className="text-ink">
        <span className="font-semibold">Synthetic demonstration data. </span>
        <span className="text-ink-secondary">
          {detail ??
            'The transactions shown here were generated to demonstrate the workflow and analytics. They are not real Philippine government transactions and must not be read as official statistics.'}
        </span>
      </div>
    </div>
  )
}

/**
 * Attaches the honest limitations of a computed figure to the figure itself,
 * rather than burying them in documentation nobody opens.
 */
export function MetricCaveats({
  caveats,
  className,
}: {
  caveats: readonly string[]
  className?: string
}) {
  if (caveats.length === 0) return null
  return (
    <div className={cn('flex items-start gap-2 text-xs text-ink-muted', className)}>
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <ul className="space-y-1">
        {caveats.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  )
}
