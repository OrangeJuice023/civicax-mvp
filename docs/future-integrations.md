# Possible future integration points

This is a documentation-only list, produced during the v0.1 MVP polish pass.
**Nothing below is implemented.** Kawing v0.1 has no outbound network calls,
no external API clients, and no credentials for any third-party system. Every
project, milestone, evidence, validation and validator record in the running
app is synthetic demo data created by `prisma/seed.ts`.

The list exists so that when external integrations ARE built, they have an
obvious point of entry that does not require restructuring the domain layer
that already exists. The intended shape, once any of this is built, is:

```
External system  →  Integration layer  →  Kawing domain services  →  Workflow  →  Audit  →  UI
```

Today, everything left of "Kawing domain services" does not exist - the UI
reads and writes through `src/lib/infrastructure/` (queries + the
`engine.ts` transition functions) directly against the seeded database. That
boundary is exactly where an integration layer would plug in later: a sync
job would call the same `completeValidation()` / `appendProjectEvent()`
primitives an authenticated officer's browser action calls today, not a new
parallel write path.

## 1. DPWH / national infrastructure project systems

- **Data exchanged:** project registration (name, location, budget,
  contractor, timeline), milestone/contract-phase status.
- **Direction:** inbound (DPWH's system of record → Kawing `Project` /
  `Milestone` rows).
- **Authentication:** almost certainly an agency-issued API key or mutual
  TLS client certificate, held server-side only, never in a browser.
- **Entry point:** a new `src/lib/integrations/dpwh/` sync module writing
  through the same `Project`/`Milestone` create paths `prisma/seed.ts` uses
  today, tagging rows `dataClassification: 'OFFICIAL_SOURCE'` instead of
  `SYNTHETIC_DEMO` (see `src/lib/domain/constants.ts`).

## 2. LGU (e.g. Quezon City) project and budget systems

- **Data exchanged:** locally-funded project records, budget allocations,
  fund disbursement figures.
- **Direction:** inbound.
- **Authentication:** LGU-specific; likely OAuth2 client-credentials against
  the LGU's own system, or a scheduled signed-file drop (SFTP/S3) rather than
  a live API, given typical LGU IT capacity.
- **Entry point:** same `Project`/`Milestone` domain boundary as above, one
  integration module per source system so a bad feed from one LGU cannot
  corrupt another's data.

## 3. Procurement systems (e.g. PhilGEPS)

- **Data exchanged:** procurement stage, contract award, contractor
  identity, contract value.
- **Direction:** inbound, feeding `Project.procurementId` / `contractId` and
  a `PROCUREMENT_STARTED` / `CONTRACT_AWARDED`-style event (the Case-domain
  vocabulary in `src/lib/domain/constants.ts` already has these two event
  types; the infrastructure domain would need its own equivalents added to
  `INFRASTRUCTURE_EVENT_TYPES` in `src/lib/infrastructure/constants.ts`).
- **Authentication:** public-sector API credentials, agency-scoped.
- **Entry point:** integration layer only appends events / updates the two
  procurement fields; it must never be granted the authority
  `completeValidation()`/`approveMilestone()` have, because procurement data
  is a different fact from "a validator approved this milestone."

## 4. Finance / accounting systems

- **Data exchanged:** fund disbursement amounts and dates, payment vouchers.
- **Direction:** inbound, feeding `Project.fundsDisbursed` and a
  `PAYMENT_RELEASED` event (already a recognised
  `INFRASTRUCTURE_EVENT_TYPES` value, currently unused since no runtime path
  emits it yet).
- **Authentication:** agency finance-system credentials; this integration in
  particular should be read-only against the finance system (Kawing
  consumes disbursement facts, it does not initiate payments).
- **Entry point:** a validated update path that enforces
  `fundsDisbursed <= budget` (the same invariant `prisma/seed.ts`'s assertions
  already check for seeded data) before writing.

## 5. Inspection / evidence capture systems

- **Data exchanged:** geotagged photos, inspection forms, lab reports - the
  same categories already modelled by `Evidence.type`
  (`src/lib/infrastructure/constants.ts`: `PHOTO`, `REPORT`,
  `INSPECTION_FORM`, `ENGINEERING_DRAWING`, ...).
- **Direction:** inbound (field app → Kawing `Evidence` rows) and outbound
  (Kawing milestone/evidence-requirement definitions → field app, so
  inspectors know what to capture).
- **Authentication:** per-device or per-inspector API token; this is the
  integration most likely to need real file storage, since
  `Evidence.fileRef` is currently a pointer string only - v0.1 stores no
  actual files.
- **Entry point:** would populate `Evidence.status = SUBMITTED` and let the
  existing verify path (an officer marking it `VERIFIED`/`REJECTED`) work
  unchanged.

## 6. Document management systems

- **Data exchanged:** contract documents, permits, as-built drawings.
- **Direction:** bidirectional.
- **Authentication:** agency DMS credentials, likely OAuth2.
- **Entry point:** `Evidence.fileRef` / `Evidence.source` are already
  pointer-only fields for exactly this reason - a DMS integration would
  populate them with a real document ID instead of a synthetic placeholder.

## 7. Open-data / OC4IDS-compatible infrastructure data

- **Data exchanged:** the Open Contracting for Infrastructure Data Standard
  fields (project, contracting process, budget, transaction, contract,
  implementation, completion) - close in shape to the existing `Project`/
  `Milestone` model, but not identical.
- **Direction:** primarily outbound (Kawing → a public OC4IDS feed), since
  this is a transparency-portal use case, not a system of record.
- **Authentication:** typically none for the outbound publish (open data);
  an inbound OC4IDS import (adopting someone else's published data) would
  need its own provenance tagging (`dataClassification: 'OFFICIAL_SOURCE'`).
- **Entry point:** a read-only export module over the existing domain
  queries in `src/lib/infrastructure/queries.ts` - no new write path at all.

## 8. Public transparency portals

- **Data exchanged:** the same public-facing projection the
  `project:read` (non-internal) policy branch already computes in
  `src/app/api/infrastructure/[projectId]/route.ts` - status, progress,
  budget, milestone name, validator codes (not names), no internal notes.
- **Direction:** outbound only.
- **Authentication:** none, or a public API rate-limit key.
- **Entry point:** the public projection logic already exists (see the
  `internal`/`publicProject` branch in the route above); a portal
  integration would just be a new consumer of that same shape, not new logic.

---

## What every future integration must NOT do

- **Never write directly to `Milestone.status` or `Validation.status`.**
  Those fields only change through `src/lib/infrastructure/engine.ts`
  (`completeValidation()`, `approveMilestone()`), which is what keeps every
  state change paired with exactly one audit-chain entry. An integration
  that "syncs" a status by writing the column directly produces a state
  change the ledger never recorded - which is a worse failure mode than no
  integration at all, because it would look like an unbroken chain that is
  quietly missing history.
- **Never let an inbound sync assume an actor's authority.** A DPWH feed
  updating a project's procurement stage is not the same authority as an
  independent validator approving a milestone; each future integration needs
  its own entry in `src/lib/auth/policy.ts`'s action table, not a blanket
  "system" bypass of it.
- **Never mix provenance.** Anything entering through a future integration
  is `dataClassification: 'OFFICIAL_SOURCE'` or `'KAWING_DERIVED'`, never
  `'SYNTHETIC_DEMO'` - and the reverse: nothing seeded for the demo may ever
  be presented as if it came from one of these sources.
