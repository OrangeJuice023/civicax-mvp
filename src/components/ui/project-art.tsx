/**
 * Project artwork.
 *
 * Small, flat, obviously-illustrative SVG scenes standing in for a project
 * photo. They are drawn here rather than fetched because every project in
 * this build is synthetic demonstration data: a real photograph of a real
 * bridge next to a fabricated budget would be exactly the kind of thing the
 * provenance badges exist to prevent, and a remote image URL would add a
 * network dependency for decoration. Six scenes, chosen from the project's
 * own sector/category - no per-project art files to keep in sync.
 *
 * Palette is the brand's (navy -> blue -> teal) so the cards read as one
 * system rather than six unrelated pictures.
 */

export type ProjectArtKind = 'bridge' | 'road' | 'water' | 'school' | 'civic' | 'health'

/** Pick a scene from what the database already records about the project. */
export function projectArtKind(category: string, sector: string): ProjectArtKind {
  const s = sector.toLowerCase()
  if (s.includes('bridge')) return 'bridge'
  if (s.includes('road') || s.includes('slope')) return 'road'
  if (s.includes('water') || s.includes('reservoir') || s.includes('drainage') || s.includes('flood')) return 'water'
  if (s.includes('education')) return 'school'
  if (s.includes('health') || s.includes('hospital')) return 'health'

  switch (category) {
    case 'ROADS_AND_BRIDGES':
      return 'road'
    case 'WATER_WORKS':
      return 'water'
    case 'HEALTH_FACILITIES':
      return 'health'
    default:
      return 'civic'
  }
}

const SKY = '#e0edff'
const DEEP = '#0b2d5b'
const BLUE = '#2563eb'
const TEAL = '#10b981'
const LINE = '#94a3b8'

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 96 64" className={className} role="img" aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="96" height="64" fill={SKY} />
      {children}
    </svg>
  )
}

const SCENES: Record<ProjectArtKind, React.ReactNode> = {
  bridge: (
    <>
      <rect y="46" width="96" height="18" fill="#bfdbfe" />
      <path d="M4 40 Q48 8 92 40" stroke={BLUE} strokeWidth="3" fill="none" />
      <rect x="0" y="38" width="96" height="5" fill={DEEP} />
      <rect x="20" y="43" width="4" height="12" fill={DEEP} />
      <rect x="46" y="43" width="4" height="12" fill={DEEP} />
      <rect x="72" y="43" width="4" height="12" fill={DEEP} />
      <path d="M14 38 L14 30 M34 38 L34 20 M62 38 L62 20 M82 38 L82 30" stroke={TEAL} strokeWidth="2" />
    </>
  ),
  road: (
    <>
      <rect y="40" width="96" height="24" fill="#cbd5e1" />
      <path d="M30 64 L42 30 L54 30 L66 64 Z" fill={DEEP} />
      <path d="M47 34 L49 34 L49 42 L47 42 Z M45 46 L51 46 L51 54 L45 54 Z" fill={SKY} />
      <rect x="0" y="36" width="96" height="4" fill={TEAL} />
      <path d="M8 54 L18 54 M26 58 L36 58" stroke={LINE} strokeWidth="2" />
    </>
  ),
  water: (
    <>
      <rect y="44" width="96" height="20" fill="#bfdbfe" />
      <rect x="10" y="18" width="26" height="26" rx="3" fill={DEEP} />
      <rect x="16" y="24" width="14" height="4" fill={TEAL} />
      <rect x="36" y="30" width="46" height="7" rx="3" fill={BLUE} />
      <circle cx="82" cy="33" r="7" fill={DEEP} />
      <path d="M6 52 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" stroke={BLUE} strokeWidth="2" fill="none" />
    </>
  ),
  school: (
    <>
      <rect y="50" width="96" height="14" fill="#cbd5e1" />
      <path d="M18 26 L48 12 L78 26 Z" fill={BLUE} />
      <rect x="22" y="26" width="52" height="24" fill={DEEP} />
      <rect x="30" y="32" width="8" height="8" fill={SKY} />
      <rect x="44" y="32" width="8" height="8" fill={SKY} />
      <rect x="58" y="32" width="8" height="8" fill={SKY} />
      <rect x="44" y="42" width="8" height="8" fill={TEAL} />
      <path d="M48 12 L48 4 L58 7 L48 10" fill={TEAL} />
    </>
  ),
  civic: (
    <>
      <rect y="50" width="96" height="14" fill="#cbd5e1" />
      <path d="M10 22 L48 8 L86 22 Z" fill={BLUE} />
      <rect x="10" y="22" width="76" height="4" fill={DEEP} />
      <rect x="18" y="26" width="6" height="24" fill={DEEP} />
      <rect x="32" y="26" width="6" height="24" fill={DEEP} />
      <rect x="46" y="26" width="6" height="24" fill={DEEP} />
      <rect x="60" y="26" width="6" height="24" fill={DEEP} />
      <rect x="74" y="26" width="6" height="24" fill={DEEP} />
      <rect x="10" y="50" width="76" height="4" fill={TEAL} />
    </>
  ),
  health: (
    <>
      <rect y="50" width="96" height="14" fill="#cbd5e1" />
      <rect x="20" y="16" width="56" height="34" rx="2" fill={DEEP} />
      <rect x="44" y="8" width="8" height="8" fill={BLUE} />
      <rect x="44" y="22" width="8" height="20" fill={SKY} />
      <rect x="38" y="28" width="20" height="8" fill={SKY} />
      <rect x="26" y="24" width="8" height="6" fill={TEAL} />
      <rect x="62" y="24" width="8" height="6" fill={TEAL} />
      <rect x="26" y="36" width="8" height="6" fill={BLUE} />
      <rect x="62" y="36" width="8" height="6" fill={BLUE} />
    </>
  ),
}

export function ProjectArt({
  category,
  sector,
  className,
}: {
  category: string
  sector: string
  className?: string
}) {
  return <Frame className={className}>{SCENES[projectArtKind(category, sector)]}</Frame>
}
