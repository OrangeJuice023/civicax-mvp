/**
 * The Kawing mark.
 *
 * A minimal geometric glyph, not a wordmark abbreviation: two nodes joined by
 * a connecting link, reading as "things connecting" at any size from a
 * favicon up to a header lockup. Deliberately not a blockchain cube, a chain
 * link, a coin, a shield, or a literal government building - see
 * docs/brand-transition.md for why. Renders in `currentColor` so it follows
 * the surrounding text color in both themes without a separate dark variant.
 */
export function KawingMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="6.5" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.5" cy="17" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8.8 9.3L15.2 14.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** The mark plus the wordmark, at header scale. */
export function KawingLockup({ tagline, className }: { tagline?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-hairline bg-surface-2">
          <KawingMark className="size-4 text-ink" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide text-ink">KAWING</div>
          {tagline && (
            <div className="text-[10px] font-medium tracking-wide text-muted">See how systems connect.</div>
          )}
        </div>
      </div>
    </div>
  )
}
