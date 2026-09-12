/**
 * The Kawing mark.
 *
 * Two overlapping chevron ribbons, blue into teal - "systems connecting" -
 * matching the brand kit (primary #0B2D5B, secondary #2563EB, accent
 * #10B981). Deliberately not a blockchain cube, a chain link, a coin, a
 * shield, or a literal government building. Gradients are fixed brand hex
 * values, not theme tokens - a logo mark keeps its brand color in both
 * light and dark UI themes, unlike the rest of the app's palette.
 */
export function KawingMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id="kawingMarkBlue" x1="8" y1="72" x2="58" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0B2D5B" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="kawingMarkTeal" x1="38" y1="72" x2="92" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <path d="M10 70 L35 26 L60 70" stroke="url(#kawingMarkBlue)" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 70 L65 26 L90 70" stroke="url(#kawingMarkTeal)" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The mark plus the wordmark, at header scale. */
export function KawingLockup({ tagline, className }: { tagline?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-hairline bg-surface-2 p-1">
          <KawingMark className="size-full" />
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-wide text-[#0B2D5B] dark:text-ink">KAWING</div>
          {tagline && (
            <div className="text-[10px] font-medium tracking-wide text-muted">See how systems connect.</div>
          )}
        </div>
      </div>
    </div>
  )
}
