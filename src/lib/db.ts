import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

/**
 * Database access for Kawing.
 *
 * Prisma 7 connects through a driver adapter rather than a connection string in
 * the schema. That is what makes the PostgreSQL migration path a genuinely
 * small change rather than a rewrite:
 *
 *   1. npm install @prisma/adapter-pg
 *   2. swap the two lines below for `new PrismaPg({ connectionString })`
 *   3. change `provider = "sqlite"` to `"postgresql"` in prisma/schema.prisma
 *   4. npx prisma migrate dev
 *
 * Nothing in src/lib/workflow, src/lib/audit, src/lib/analytics or src/lib/agents
 * touches the driver, so none of it needs to change.
 */

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./dev.db'

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL })
  return new PrismaClient({ adapter })
}

// Next.js dev mode re-evaluates modules on hot reload. Without this the process
// accumulates one SQLite handle per reload until it exhausts them.
const globalForPrisma = globalThis as unknown as { kawingPrisma?: PrismaClient }

export const db: PrismaClient = globalForPrisma.kawingPrisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.kawingPrisma = db
}
