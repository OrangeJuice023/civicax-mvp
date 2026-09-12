/**
 * Statutory processing deadlines.
 *
 * ---------------------------------------------------------------------------
 * SOURCE (this is real law, not a Kawing invention)
 * ---------------------------------------------------------------------------
 * Republic Act No. 11032, the "Ease of Doing Business and Efficient Government
 * Service Delivery Act of 2018", Section 9 prescribes maximum processing times
 * for government transactions - commonly cited as the "3-7-20" rule:
 *
 *   simple transactions            ->  3 working days
 *   complex transactions           ->  7 working days
 *   highly technical applications  -> 20 working days
 *
 * Primary sources:
 *   - Official Gazette, RA 11032
 *     https://www.officialgazette.gov.ph/2018/05/28/republic-act-no-11032/
 *   - LawPhil full text
 *     https://www.lawphil.net/statutes/repacts/ra2018/ra_11032_2018.html
 *   - Anti-Red Tape Authority (ARTA), "The Ease of Doing Business Law"
 *     https://arta.gov.ph/about/the-eodb-law/
 *
 * Two further ceilings exist in the statute and are recorded here for
 * completeness. Kawing does not apply them automatically, because deciding
 * that a given transaction falls under them is a legal determination that
 * belongs to the office concerned, not to this software:
 *
 *   - Applications involving activities that pose danger to public health,
 *     public safety, public morals or public policy: 20 days, or as determined
 *     by the agency concerned, whichever is SHORTER.
 *   - Applications requiring approval of the local Sanggunian: 45 working days,
 *     extendible by a further 20 working days.
 *
 * Anything in Kawing that is NOT from the statute above - per-step targets,
 * queue thresholds, "expected" durations - is labelled a Kawing prototype
 * metric and must not be presented as a legal requirement.
 */

export const RA_11032 = {
  citation: 'Republic Act No. 11032 (2018), Sec. 9',
  shortName: 'RA 11032 (Ease of Doing Business Act)',
  url: 'https://www.officialgazette.gov.ph/2018/05/28/republic-act-no-11032/',
} as const

export const RA11032_CLASSIFICATIONS = [
  'SIMPLE',
  'COMPLEX',
  'HIGHLY_TECHNICAL',
] as const
export type Ra11032Classification = (typeof RA11032_CLASSIFICATIONS)[number]

/** The statutory "3-7-20" ceilings, in WORKING days. */
export const RA_11032_WORKING_DAY_LIMITS: Record<Ra11032Classification, number> = {
  SIMPLE: 3,
  COMPLEX: 7,
  HIGHLY_TECHNICAL: 20,
}

export const RA11032_CLASSIFICATION_LABELS: Record<Ra11032Classification, string> = {
  SIMPLE: 'Simple transaction',
  COMPLEX: 'Complex transaction',
  HIGHLY_TECHNICAL: 'Highly technical application',
}

/**
 * Statutory definitions, paraphrased from RA 11032 Sec. 3. Shown in the UI so a
 * reviewer can see why a service carries the deadline it does.
 */
export const RA11032_CLASSIFICATION_DEFINITIONS: Record<Ra11032Classification, string> = {
  SIMPLE:
    'Requires only ministerial action, or presents only inconsequential issues for resolution by the officer or employee concerned.',
  COMPLEX:
    'Requires evaluation and the resolution of complicated issues by the officer or employee concerned, as determined by the office.',
  HIGHLY_TECHNICAL:
    'Requires the use of technical knowledge, specialised skills, or training to process.',
}

// ---------------------------------------------------------------- working days

/**
 * Non-working days.
 *
 * Weekends are structural. Philippine regular and special non-working holidays
 * are declared annually by Presidential Proclamation and vary year to year, so
 * NONE are hardcoded here: inventing a holiday calendar would be inventing a
 * government fact. Supply them explicitly when a real calendar is available.
 *
 * Consequence to be honest about: with an empty holiday list, computed
 * deadlines are slightly EARLIER (stricter) than the true statutory deadline in
 * any period containing a holiday. The prototype surfaces this caveat rather
 * than hiding it.
 */
export type HolidayCalendar = {
  /** ISO date strings, "YYYY-MM-DD", in Philippine local reckoning. */
  dates: readonly string[]
  /** Where the calendar came from, for the transparency page. */
  sourceNote: string
}

export const EMPTY_HOLIDAY_CALENDAR: HolidayCalendar = {
  dates: [],
  sourceNote:
    'No holiday calendar configured. Philippine holidays are declared annually by Presidential Proclamation; none are assumed by this prototype.',
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Saturday or Sunday. */
export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

export function isWorkingDay(
  d: Date,
  calendar: HolidayCalendar = EMPTY_HOLIDAY_CALENDAR,
): boolean {
  if (isWeekend(d)) return false
  return !calendar.dates.includes(toIsoDate(d))
}

/**
 * Advance `from` by `days` working days.
 *
 * Counting convention: the day of submission is day 0, and the returned instant
 * is the end of the Nth working day after it. This is the reading that gives an
 * applicant who files on a Friday the full statutory period.
 */
export function addWorkingDays(
  from: Date,
  days: number,
  calendar: HolidayCalendar = EMPTY_HOLIDAY_CALENDAR,
): Date {
  if (!Number.isFinite(days) || days < 0) {
    throw new Error(`addWorkingDays: days must be a non-negative number, got ${days}`)
  }
  const cursor = new Date(from.getTime())
  let remaining = Math.floor(days)
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    if (isWorkingDay(cursor, calendar)) remaining -= 1
  }
  return cursor
}

/** Count working days in [start, end). Negative if end precedes start. */
export function countWorkingDays(
  start: Date,
  end: Date,
  calendar: HolidayCalendar = EMPTY_HOLIDAY_CALENDAR,
): number {
  const sign = end.getTime() < start.getTime() ? -1 : 1
  const a = sign === 1 ? start : end
  const b = sign === 1 ? end : start
  const cursor = new Date(a.getTime())
  cursor.setUTCHours(0, 0, 0, 0)
  const limit = new Date(b.getTime())
  limit.setUTCHours(0, 0, 0, 0)
  let count = 0
  while (cursor.getTime() < limit.getTime()) {
    if (isWorkingDay(cursor, calendar)) count += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count * sign
}

/**
 * The statutory deadline for a transaction, derived from its RA 11032
 * classification. Returns null for classifications we do not recognise rather
 * than silently guessing a deadline.
 */
export function computeStatutoryDueDate(
  submittedAt: Date,
  classification: string,
  calendar: HolidayCalendar = EMPTY_HOLIDAY_CALENDAR,
): Date | null {
  if (!(RA11032_CLASSIFICATIONS as readonly string[]).includes(classification)) {
    return null
  }
  const limit = RA_11032_WORKING_DAY_LIMITS[classification as Ra11032Classification]
  return addWorkingDays(submittedAt, limit, calendar)
}

export type SlaState = 'ON_TIME' | 'AT_RISK' | 'BREACHED' | 'UNKNOWN'

/**
 * Evaluate a case against its statutory deadline.
 *
 * AT_RISK is a Kawing prototype heuristic (a configurable fraction of the
 * period remaining), NOT a statutory concept. Only BREACHED corresponds to
 * something the statute actually defines.
 */
export function evaluateSla(
  now: Date,
  dueAt: Date | null,
  submittedAt: Date | null,
  atRiskFraction = 0.25,
): { state: SlaState; msRemaining: number | null } {
  if (!dueAt) return { state: 'UNKNOWN', msRemaining: null }
  const msRemaining = dueAt.getTime() - now.getTime()
  if (msRemaining < 0) return { state: 'BREACHED', msRemaining }
  if (submittedAt) {
    const total = dueAt.getTime() - submittedAt.getTime()
    if (total > 0 && msRemaining / total <= atRiskFraction) {
      return { state: 'AT_RISK', msRemaining }
    }
  }
  return { state: 'ON_TIME', msRemaining }
}
