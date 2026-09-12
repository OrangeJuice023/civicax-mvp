/**
 * The Kawing mark.
 *
 * Two overlapping chevron ribbons, blue into teal - "systems connecting" -
 * matching the brand kit (primary #0B2D5B, secondary #2563EB, accent
 * #10B981). Deliberately not a blockchain cube, a chain link, a coin, a
 * shield, or a literal government building.
 *
 * Gradients are fixed brand hex values, not theme tokens: a logo keeps its
 * brand colour in both light and dark UI. `tone` picks the pairing rather
 * than the colour - "brand" for light surfaces, "light" for the navy shell,
 * where the dark end of the brand gradient would disappear into the
 * background.
 */
export function KawingMark({
  className,
  tone = 'brand',
}: {
  className?: string
  tone?: 'brand' | 'light'
}) {
  const a = tone === 'light' ? ['#93c5fd', '#38bdf8'] : ['#0b2d5b', '#2563eb']
  const b = tone === 'light' ? ['#38bdf8', '#34d399'] : ['#2563eb', '#10b981']
  const idA = `kawingMarkA-${tone}`
  const idB = `kawingMarkB-${tone}`

  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id={idA} x1="8" y1="72" x2="58" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={a[0]} />
          <stop offset="1" stopColor={a[1]} />
        </linearGradient>
        <linearGradient id={idB} x1="38" y1="72" x2="92" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={b[0]} />
          <stop offset="1" stopColor={b[1]} />
        </linearGradient>
      </defs>
      <path d="M10 70 L35 26 L60 70" stroke={`url(#${idA})`} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 70 L65 26 L90 70" stroke={`url(#${idB})`} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The mark plus the wordmark. `onDark` is the navy-shell variant used in the
 * sidebar; the default sits on a light surface.
 */
export function KawingLockup({
  tagline,
  onDark = false,
  className,
}: {
  tagline?: boolean
  onDark?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <div
          className={
            onDark
              ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 p-1.5'
              : 'flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface-2 p-1.5'
          }
        >
          <KawingMark className="size-full" tone={onDark ? 'light' : 'brand'} />
        </div>
        <div className="min-w-0">
          <div
            className={
              onDark
                ? 'text-base font-extrabold leading-none tracking-wide text-white'
                : 'text-base font-extrabold leading-none tracking-wide text-[#0b2d5b] dark:text-ink'
            }
          >
            KAWING
          </div>
          {tagline && (
            <div
              className={
                onDark
                  ? 'mt-1 truncate text-[10px] font-medium tracking-wide text-white/60'
                  : 'mt-1 truncate text-[10px] font-medium tracking-wide text-muted'
              }
            >
              See how systems connect.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
