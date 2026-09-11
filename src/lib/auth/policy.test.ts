/**
 * The authorization matrix, asserted.
 *
 * These tests are pure: no database, no request, no Next.js runtime. That is
 * deliberate and it is the reason policy.ts has no imports that would prevent
 * it. An access-control rule that can only be tested through an HTTP round trip
 * is a rule nobody tests often enough.
 *
 * The negative cases matter more than the positive ones, so they are written
 * first in each block: a citizen reading another citizen's case, an officer
 * acting on another office's case, and an anonymous caller getting nothing at
 * all. A permission system is only as good as its refusals.
 *
 * Run: npx vitest run src/lib/auth/policy.test.ts
 * (There is no vitest config in the project; the default include pattern picks
 * this file up, and every import here is relative so no path alias is needed.)
 */

import { describe, expect, it } from 'vitest'
import {
  ACTIONS,
  analyticsScopeForUser,
  can,
  caseAccessScopeForUser,
  filterVisibleEvents,
  hidesActorIdentity,
  projectEventsForUser,
  type Action,
  type CaseResource,
} from './policy'
import type { SessionUser } from './session'

// ---------------------------------------------------------------- fixtures

const CITIZEN_ID = 'user_citizen_juan'
const OTHER_CITIZEN_ID = 'user_citizen_maria'
const BPLO = 'office_bplo'
const ASSESSOR = 'office_assessor'

function citizen(userId: string = CITIZEN_ID): SessionUser {
  return {
    userId,
    email: 'applicant@example.test',
    name: 'Synthetic Applicant',
    role: 'CITIZEN',
    officeId: null,
    officeName: null,
    position: null,
  }
}

function officer(officeId: string | null = BPLO): SessionUser {
  return {
    userId: 'user_officer_1',
    email: 'officer@example.test',
    name: 'Synthetic Officer',
    role: 'OFFICER',
    officeId,
    officeName: officeId === null ? null : 'Synthetic Office',
    position: 'Evaluator',
  }
}

function administrator(): SessionUser {
  return {
    userId: 'user_admin_1',
    email: 'admin@example.test',
    name: 'Synthetic Administrator',
    role: 'ADMINISTRATOR',
    officeId: null,
    officeName: null,
    position: 'System Administrator',
  }
}

/** A case filed by CITIZEN_ID and currently held by the BPLO. */
const ownCaseAtBplo: CaseResource = {
  kind: 'case',
  applicantId: CITIZEN_ID,
  currentOfficeId: BPLO,
}

const otherCitizensCaseAtBplo: CaseResource = {
  kind: 'case',
  applicantId: OTHER_CITIZEN_ID,
  currentOfficeId: BPLO,
}

const ownCaseAtAssessor: CaseResource = {
  kind: 'case',
  applicantId: CITIZEN_ID,
  currentOfficeId: ASSESSOR,
}

/** Encoded at a counter: no citizen account is linked to it. */
const walkInCaseAtBplo: CaseResource = {
  kind: 'case',
  applicantId: null,
  currentOfficeId: BPLO,
}

const GLOBAL = { kind: 'global' } as const

/** Actions that decide or mutate something and so need a specific case. */
const CASE_REQUIRED_ACTIONS: readonly Action[] = [
  'case:transition',
  'case:note',
  'document:verify',
  'recommendation:review',
]

// ---------------------------------------------------------------- anonymous

describe('an unauthenticated caller', () => {
  it('is denied every action, on every resource shape', () => {
    for (const action of ACTIONS) {
      for (const resource of [GLOBAL, ownCaseAtBplo, walkInCaseAtBplo] as const) {
        const decision = can(null, action, resource)
        expect(decision.allowed, `${action} must be denied to an anonymous caller`).toBe(
          false,
        )
        expect(decision.reason).toBeTruthy()
      }
    }
  })

  it('has no case access scope and no analytics scope', () => {
    expect(caseAccessScopeForUser(null)).toEqual({ kind: 'NONE' })
    expect(analyticsScopeForUser(null)).toEqual({ kind: 'NONE' })
  })
})

// ---------------------------------------------------------------- citizen

describe('a citizen', () => {
  it('cannot read another applicant\'s case', () => {
    const decision = can(citizen(), 'case:read', otherCitizensCaseAtBplo)
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toMatch(/another applicant/i)
  })

  it('cannot read a case that is not linked to any applicant account', () => {
    expect(can(citizen(), 'case:read', walkInCaseAtBplo).allowed).toBe(false)
  })

  it('can read their own case, wherever it currently sits', () => {
    expect(can(citizen(), 'case:read', ownCaseAtBplo).allowed).toBe(true)
    expect(can(citizen(), 'case:read', ownCaseAtAssessor).allowed).toBe(true)
  })

  it('can list their own cases, but the grant carries a filter obligation', () => {
    const decision = can(citizen(), 'case:read', GLOBAL)
    expect(decision.allowed).toBe(true)
    // An allowed decision with a reason is an instruction, not decoration.
    expect(decision.reason).toMatch(/applicantId/)
    expect(caseAccessScopeForUser(citizen())).toEqual({
      kind: 'OWN',
      applicantId: CITIZEN_ID,
    })
  })

  it('can file an application', () => {
    expect(can(citizen(), 'case:create').allowed).toBe(true)
  })

  it('can never read internal case data, even on their own case', () => {
    expect(can(citizen(), 'case:read-internal', ownCaseAtBplo).allowed).toBe(false)
  })

  it('can never act on the workflow, verify documents, or annotate a case', () => {
    for (const action of [
      'case:transition',
      'case:note',
      'document:verify',
    ] as const) {
      expect(can(citizen(), action, ownCaseAtBplo).allowed, action).toBe(false)
    }
  })

  it('can never see or review agent recommendations', () => {
    expect(can(citizen(), 'recommendation:read', ownCaseAtBplo).allowed).toBe(false)
    expect(can(citizen(), 'recommendation:review', ownCaseAtBplo).allowed).toBe(false)
  })

  it('can never read analytics, configure workflows, or verify the audit chain', () => {
    for (const action of [
      'analytics:read',
      'workflow:configure',
      'audit:verify',
    ] as const) {
      expect(can(citizen(), action).allowed, action).toBe(false)
    }
    expect(analyticsScopeForUser(citizen())).toEqual({ kind: 'NONE' })
  })

  it('gets nothing when the session carries no user id', () => {
    const brokenSession: SessionUser = { ...citizen(), userId: '' }
    expect(can(brokenSession, 'case:read', ownCaseAtBplo).allowed).toBe(false)
    expect(caseAccessScopeForUser(brokenSession)).toEqual({ kind: 'NONE' })
  })
})

// ---------------------------------------------------------------- officer

describe('an officer', () => {
  it('cannot act on a case held by another office', () => {
    const decision = can(officer(BPLO), 'case:transition', ownCaseAtAssessor)
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toMatch(/another office/i)
  })

  it('cannot read a case held by another office, internally or otherwise', () => {
    expect(can(officer(BPLO), 'case:read', ownCaseAtAssessor).allowed).toBe(false)
    expect(can(officer(BPLO), 'case:read-internal', ownCaseAtAssessor).allowed).toBe(false)
  })

  it('can read and act on cases currently at their own office', () => {
    const me = officer(BPLO)
    for (const action of [
      'case:read',
      'case:read-internal',
      'case:transition',
      'case:note',
      'document:verify',
      'recommendation:read',
      'recommendation:review',
    ] as const) {
      expect(can(me, action, ownCaseAtBplo).allowed, action).toBe(true)
    }
  })

  it('can act on a walk-in case with no linked applicant account', () => {
    expect(can(officer(BPLO), 'case:transition', walkInCaseAtBplo).allowed).toBe(true)
  })

  it('can encode a new application for a walk-in applicant', () => {
    expect(can(officer(BPLO), 'case:create').allowed).toBe(true)
  })

  it('gets analytics scoped to their own office, never all offices', () => {
    const decision = can(officer(BPLO), 'analytics:read')
    expect(decision.allowed).toBe(true)
    expect(decision.reason).toMatch(/office/i)
    expect(analyticsScopeForUser(officer(BPLO))).toEqual({
      kind: 'OFFICE',
      officeId: BPLO,
    })
  })

  it('cannot configure workflows or verify the audit chain', () => {
    expect(can(officer(BPLO), 'workflow:configure').allowed).toBe(false)
    expect(can(officer(BPLO), 'audit:verify').allowed).toBe(false)
  })

  it('with no office assignment has no case access at all', () => {
    const unposted = officer(null)
    expect(can(unposted, 'case:read', ownCaseAtBplo).allowed).toBe(false)
    expect(can(unposted, 'case:read', GLOBAL).allowed).toBe(false)
    expect(can(unposted, 'case:transition', ownCaseAtBplo).allowed).toBe(false)
    expect(caseAccessScopeForUser(unposted)).toEqual({ kind: 'NONE' })
    expect(analyticsScopeForUser(unposted)).toEqual({ kind: 'NONE' })
  })

  it('is scoped to their office for list queries', () => {
    expect(caseAccessScopeForUser(officer(ASSESSOR))).toEqual({
      kind: 'OFFICE',
      officeId: ASSESSOR,
    })
  })
})

// ---------------------------------------------------------------- administrator

describe('an administrator', () => {
  it('can read every case and its internal record, in any office', () => {
    const admin = administrator()
    for (const resource of [ownCaseAtBplo, ownCaseAtAssessor, walkInCaseAtBplo]) {
      expect(can(admin, 'case:read', resource).allowed).toBe(true)
      expect(can(admin, 'case:read-internal', resource).allowed).toBe(true)
    }
    expect(caseAccessScopeForUser(admin)).toEqual({ kind: 'ALL' })
  })

  it('can read analytics for all offices, configure workflows, and verify the audit chain', () => {
    const admin = administrator()
    expect(can(admin, 'analytics:read').allowed).toBe(true)
    expect(can(admin, 'workflow:configure').allowed).toBe(true)
    expect(can(admin, 'audit:verify').allowed).toBe(true)
    expect(analyticsScopeForUser(admin)).toEqual({ kind: 'ALL' })
  })

  it('can read agent recommendations but not review them', () => {
    expect(can(administrator(), 'recommendation:read', ownCaseAtBplo).allowed).toBe(true)
    expect(can(administrator(), 'recommendation:review', ownCaseAtBplo).allowed).toBe(false)
  })

  it('cannot decide an individual transaction - separation of duty', () => {
    const admin = administrator()
    for (const action of [
      'case:create',
      'case:transition',
      'case:note',
      'document:verify',
    ] as const) {
      const decision = can(admin, action, ownCaseAtBplo)
      expect(decision.allowed, action).toBe(false)
      expect(decision.reason, action).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------- fail-closed

describe('the policy fails closed', () => {
  it('denies an action that is not in the vocabulary', () => {
    // Cast, because the type system already prevents this - the guard exists
    // for a string that arrived from JSON at runtime.
    const bogus = 'case:delete-everything' as Action
    expect(can(citizen(), bogus, ownCaseAtBplo).allowed).toBe(false)
    expect(can(officer(BPLO), bogus, ownCaseAtBplo).allowed).toBe(false)
    expect(can(administrator(), bogus, ownCaseAtBplo).allowed).toBe(false)
  })

  it('denies a role that is not in the vocabulary', () => {
    // An old or hand-crafted token could carry anything.
    const impostor = { ...officer(BPLO), role: 'SUPERUSER' } as unknown as SessionUser
    for (const action of ACTIONS) {
      expect(can(impostor, action, ownCaseAtBplo).allowed, action).toBe(false)
    }
    expect(caseAccessScopeForUser(impostor)).toEqual({ kind: 'NONE' })
  })

  it('refuses deciding actions when no specific case is supplied', () => {
    for (const action of CASE_REQUIRED_ACTIONS) {
      expect(can(officer(BPLO), action, GLOBAL).allowed, action).toBe(false)
      expect(can(citizen(), action, GLOBAL).allowed, action).toBe(false)
      expect(can(administrator(), action, GLOBAL).allowed, action).toBe(false)
    }
  })

  it('always explains a refusal', () => {
    for (const user of [null, citizen(), officer(BPLO), officer(null), administrator()]) {
      for (const action of ACTIONS) {
        for (const resource of [GLOBAL, ownCaseAtBplo, otherCitizensCaseAtBplo] as const) {
          const decision = can(user, action, resource)
          if (!decision.allowed) {
            expect(decision.reason, `${user?.role ?? 'anonymous'} / ${action}`).toBeTruthy()
          }
        }
      }
    }
  })

  it('has a rule for every role and action combination', () => {
    // If a new Action is added to ACTIONS without a row in the matrix, this
    // catches it as a denial with the unknown-action reason rather than as a
    // silent grant.
    for (const user of [citizen(), officer(BPLO), administrator()]) {
      for (const action of ACTIONS) {
        const decision = can(user, action, ownCaseAtBplo)
        expect(decision.reason ?? '', `${user.role} / ${action}`).not.toMatch(
          /Unknown action/,
        )
      }
    }
  })
})

// ---------------------------------------------------------------- transparency

describe('event visibility filtering', () => {
  type Event = {
    id: string
    visibility: string
    actorUserId: string | null
    actorRole: string | null
  }

  const events: Event[] = [
    { id: 'e1', visibility: 'CITIZEN', actorUserId: 'user_officer_1', actorRole: 'OFFICER' },
    { id: 'e2', visibility: 'INTERNAL', actorUserId: 'user_officer_1', actorRole: 'OFFICER' },
    { id: 'e3', visibility: 'CITIZEN', actorUserId: null, actorRole: null },
    // A value outside the vocabulary. Must be withheld, not shown.
    { id: 'e4', visibility: 'public', actorUserId: 'user_officer_1', actorRole: 'OFFICER' },
  ]

  it('gives an anonymous caller nothing', () => {
    expect(filterVisibleEvents(null, ownCaseAtBplo, events)).toEqual([])
  })

  it('gives the applicant only the events declared citizen-visible', () => {
    const visible = filterVisibleEvents(citizen(), ownCaseAtBplo, events)
    expect(visible.map((e) => e.id)).toEqual(['e1', 'e3'])
  })

  it('withholds an unrecognised visibility value from the applicant', () => {
    const visible = filterVisibleEvents(citizen(), ownCaseAtBplo, events)
    expect(visible.map((e) => e.id)).not.toContain('e4')
  })

  it('gives a citizen nothing on another applicant\'s case', () => {
    expect(filterVisibleEvents(citizen(), otherCitizensCaseAtBplo, events)).toEqual([])
  })

  it('gives the holding office the whole log', () => {
    const visible = filterVisibleEvents(officer(BPLO), ownCaseAtBplo, events)
    expect(visible.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4'])
  })

  it('gives another office nothing', () => {
    expect(filterVisibleEvents(officer(ASSESSOR), ownCaseAtBplo, events)).toEqual([])
  })

  it('gives an administrator the whole log for any case', () => {
    const visible = filterVisibleEvents(administrator(), ownCaseAtAssessor, events)
    expect(visible).toHaveLength(events.length)
  })

  it('does not mutate or alias the input array', () => {
    const visible = filterVisibleEvents(administrator(), ownCaseAtBplo, events)
    expect(visible).not.toBe(events)
    visible.pop()
    expect(events).toHaveLength(4)
  })
})

describe('actor identity redaction', () => {
  type Event = {
    id: string
    visibility: string
    actorUserId: string | null
    actorRole: string | null
  }

  const events: Event[] = [
    { id: 'e1', visibility: 'CITIZEN', actorUserId: 'user_officer_1', actorRole: 'OFFICER' },
    { id: 'e2', visibility: 'INTERNAL', actorUserId: 'user_officer_1', actorRole: 'OFFICER' },
  ]

  it('hides which individual acted from an applicant', () => {
    expect(hidesActorIdentity(citizen())).toBe(true)
    const projected = projectEventsForUser(citizen(), ownCaseAtBplo, events)
    expect(projected).toHaveLength(1)
    expect(projected[0].actorUserId).toBeNull()
    expect(projected[0].actorRole).toBeNull()
    // The original row is untouched.
    expect(events[0].actorUserId).toBe('user_officer_1')
  })

  it('keeps actor identity for the handling office and for administrators', () => {
    expect(hidesActorIdentity(officer(BPLO))).toBe(false)
    expect(hidesActorIdentity(administrator())).toBe(false)
    const forOfficer = projectEventsForUser(officer(BPLO), ownCaseAtBplo, events)
    expect(forOfficer.map((e) => e.actorUserId)).toEqual([
      'user_officer_1',
      'user_officer_1',
    ])
  })

  it('hides actor identity from an anonymous caller (who sees nothing anyway)', () => {
    expect(hidesActorIdentity(null)).toBe(true)
    expect(projectEventsForUser(null, ownCaseAtBplo, events)).toEqual([])
  })
})
