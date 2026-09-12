import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Prisma 7 removed `url` from the schema datasource block. Migration and
// introspection commands read the connection string from here instead; the
// runtime client gets it via a driver adapter (see src/lib/db.ts).
//
// Node 20.12+/24 can load .env without a dependency.
try {
  process.loadEnvFile(path.join(process.cwd(), '.env'))
} catch {
  // No .env present (CI, or env vars already exported) - fall through to process.env.
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Migrations need a DIRECT connection, not the pgbouncer-pooled one -
    // pooled connections in transaction mode don't reliably support the
    // advisory locks `prisma migrate` takes. Neon/Vercel Postgres expose both
    // on the same project under two naming conventions (DATABASE_URL_UNPOOLED
    // and POSTGRES_URL_NON_POOLING point at the same direct connection); the
    // pooled equivalent (POSTGRES_PRISMA_URL) is what the runtime client in
    // src/lib/db.ts uses instead.
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      '',
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
