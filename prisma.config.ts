import path from 'node:path'
import { defineConfig, env } from 'prisma/config'

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
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
