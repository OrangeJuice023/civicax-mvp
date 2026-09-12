# Brand transition: CivicaX → Kawing

## What changed

The platform's public product identity is now:

**KAWING**
*See how systems connect.*

CivicaX was the previous working name of the platform, used from initial
scaffolding through the v0.1 MVP hardening pass. Development continues on the
same codebase, the same database schema, the same domain model, and the same
seeded demonstration data - this is a rename of the product identity, not a
rebuild.

## Why

The platform has been renamed to Kawing to better represent the company's
broader identity as a systems-connectivity and public infrastructure
platform. "Kawing" - a link, a connection - reflects what the product
actually shows an oversight user: how a project, its milestones, its
evidence, its validations, its approvals and its audit trail all connect
into one traceable record, rather than sitting in separate systems.

## What this means going forward

- **Active, user-facing surfaces** - the app's header, navigation, page
  titles, metadata, the login screen, and product-language comments in the
  source describing the *current* system - all say Kawing now.
- **Historical references may remain** where they describe development
  history, migration history, or provenance rather than the current active
  product. Concretely, in this repository that means:
  - Prisma migration directory names and their SQL contents are untouched -
    they are a historical record of schema changes and were never renamed
    for cosmetic reasons.
  - Git commit history is untouched - past commit messages that say
    "CivicaX" describe what was true when they were written.
  - This document itself, which exists specifically to record the former
    name.
- **No functional behavior changed.** The workflow engine, the audit hash
  chain, the authorization policy, the seeded demonstration data (18
  projects, 9 validators, the hero project `PRJ-00026`), and every route all
  work exactly as they did before the rename. Internal identifiers that were
  safe to rename without any compatibility cost (the session cookie name,
  the JWT issuer/audience, a couple of internal constant names) were
  updated to match; nothing that would have required a database migration or
  broken a stored record was touched.

## Not a precise legal renaming date

This repository has no prior record of an official renaming date, so none is
asserted here. This document reflects the state of the codebase as of the
rebrand pass that introduced it.
