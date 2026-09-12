import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Database access for Kawing.
 *
 * PostgreSQL (Neon, via Vercel Postgres) - the migration this file's own
 * comment used to describe as the future path. Prisma 7 connects through a
 * driver adapter rather than a connection string in the schema, which is
 * what made that migration a two-line change here rather than a rewrite:
 * nothing in src/lib/workflow, src/lib/audit, src/lib/analytics or
 * src/lib/agents touches the driver, so none of it needed to change.
 *
 * Uses the POOLED connection string (pgbouncer) - correct for a runtime
 * client that may be instantiated across many concurrent serverless
 * invocations. POSTGRES_PRISMA_URL is Neon's Prisma-specific pooled variable
 * (pre-configured for pgbouncer compatibility); DATABASE_URL is the same kind
 * of pooled connection under the more generic name, used as a fallback.
 * Migrations use the direct/unpooled string instead; see prisma.config.ts.
 */

const DATABASE_URL = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? ''

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL })
  return new PrismaClient({ adapter })
}

// Next.js dev mode re-evaluates modules on hot reload. Without this the process
// accumulates one connection pool per reload until it exhausts the database's
// connection limit.
const globalForPrisma = globalThis as unknown as { kawingPrisma?: PrismaClient }

export const db: PrismaClient = globalForPrisma.kawingPrisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.kawingPrisma = db
}
