# Kawing

*See how systems connect.*

Kawing is a public infrastructure oversight platform. It connects project
activity, evidence, validation, approvals, and audit history into one
operational view - so an oversight user can answer, in under a minute: what
projects are active, what stage each one is in, what's blocking a milestone,
who needs to act next, and whether the historical record can be trusted.

> The project was previously developed under the working name **CivicaX**.
> See [`docs/brand-transition.md`](docs/brand-transition.md) for details.

This is v0.1 of the MVP: a functional prototype over **synthetic
demonstration data only**. Nothing in the running app is live government
data - every project, validator, and audit event is fabricated by the seed
script for demonstration purposes, and the UI labels it as such throughout.

## What's in v0.1

- A **Project → Milestone → Evidence → Validation → Approval → Audit**
  domain, modelled in Prisma alongside a separate citizen-transaction
  ("Case") workflow domain.
- A **tamper-evident audit ledger**: every state change appends one event and
  one SHA-256 hash-chained record, atomically, in the same database
  transaction. The chain is recomputed from the underlying rows on every
  verification - never cached, never trusted from a prior check. See
  `src/lib/audit/hash.ts` for exactly what it does and does not prove.
- A real authorization policy (`src/lib/auth/policy.ts`) enforced
  server-side on every mutating route - not just hidden in the UI.
- Email/password sign-in against seeded demo identities (every seeded
  account shares the password `DemoPass123!` - see the sign-in page for the
  list).

## Getting started

```bash
npm install
cp .env.example .env        # then generate a real SESSION_SECRET, see the file
npx prisma migrate deploy   # apply the committed migrations
npx prisma db seed          # populate synthetic demonstration data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to
`/dashboard`; sign in from there to unlock project actions (validating a
milestone, approving it, verifying the audit chain).

## The hero demo walkthrough

The seeded project `PRJ-00026` ("Bridge Rehabilitation") is set up mid-flow
so the full lifecycle is demonstrable without any setup:

1. Open **Projects → PRJ-00026**. Its "Inspection Phase" milestone is
   **blocked on validation** - 3 of 4 required validators have approved, one
   (the independent validator) is still pending.
2. Sign in as the DPWH NCR officer (see the demo identity list on the sign-in
   page) and click **Complete Validation**. The milestone moves to
   *ready for approval*.
3. Click **Approve Milestone**. The milestone is now *approved*.
4. Sign in as the administrator identity and open **Audit Ledger** to verify
   the project's hash chain on demand.

Re-seeding (`npx prisma db seed`) resets everything back to the starting
state - the seed is deterministic and idempotent.

## Project structure

- `src/lib/workflow/` - the citizen-transaction ("Case") state machine.
- `src/lib/infrastructure/` - the Project/Milestone/Evidence/Validation
  engine, query helpers, and shared display labels/formatters.
- `src/lib/audit/` - the hash-chain ledger and its verifier, shared by both
  domains.
- `src/lib/auth/` - sessions and the authorization policy.
- `prisma/seed.ts` / `prisma/seed-data.ts` - the deterministic synthetic
  demonstration dataset, plus the seed-time assertions that check it.
- `docs/future-integrations.md` - documentation-only notes on where a real
  external system (DPWH, procurement, finance, ...) would plug in later.
  Nothing there is implemented.

## Scope

v0.1 has no external API integrations, no real blockchain network, and no
file storage - see `docs/future-integrations.md` for what's intentionally
left for later, and why the current architecture leaves room for it without
a rewrite.
