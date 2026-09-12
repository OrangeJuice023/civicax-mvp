/**
 * Test-database setup for the workflow engine tests.
 *
 * Runs as a vitest `setupFiles` entry, which executes BEFORE the test module
 * (and therefore before src/lib/db.ts is imported and the Prisma singleton is
 * constructed). That ordering is the whole reason this is a separate file: the
 * DATABASE_URL has to be redirected at a throwaway file before anything opens
 * a connection, or the tests would run against the developer's dev.db and the
 * first `submitCase` would pollute the demo data.
 *
 * The schema is applied by replaying prisma/migrations/<name>/migration.sql
 * through Prisma's own raw-execute, rather than by shelling out to
 * `prisma migrate` or `prisma db push`:
 *
 *   - the migration is already applied to the real database and this module is
 *     not permitted to run migrate commands or touch the schema;
 *   - replaying the committed SQL means the tests exercise the same DDL that
 *     production runs, so a schema change that the engine has not caught up
 *     with shows up here as a failing test rather than as a passing test
 *     against a schema vitest invented;
 *   - it needs no direct dependency on a SQLite driver (better-sqlite3 ships
 *     no TypeScript types, and importing it would break `tsc --noEmit`).
 *
 * The database file lives in the OS temp directory, not in the repository, so
 * nothing needs adding to .gitignore and a stale file can never be committed.
 */

import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(here, '..', '..', '..')

/**
 * A fixed filename, deliberately: every run starts by deleting it, so a
 * previous run's rows can never leak into this one, and a developer inspecting
 * a failure knows exactly which file to open.
 */
const TEST_DB_PATH = join(tmpdir(), 'kawing-workflow-engine-test.db')

// Prisma's better-sqlite3 adapter strips the "file:" prefix and opens the rest
// as a filesystem path, so an absolute path is safe on Windows and POSIX alike.
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`

// SQLite keeps its write-ahead log and shared-memory index alongside the
// database; leaving either behind would resurrect part of the old database.
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${TEST_DB_PATH}${suffix}`
  if (existsSync(path)) rmSync(path, { force: true })
}

/**
 * All committed migrations, in directory-name order.
 *
 * Prisma names migration directories with a leading timestamp, so
 * lexicographic order is chronological order. Replaying every migration rather
 * than only the first means this keeps working when a second migration is
 * added, without anyone having to remember to update this file.
 */
function migrationStatements(): string[] {
  const migrationsDir = resolve(projectRoot, 'prisma', 'migrations')
  const directories = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const statements: string[] = []
  for (const directory of directories) {
    const sqlPath = join(migrationsDir, directory, 'migration.sql')
    if (!existsSync(sqlPath)) continue
    const sql = readFileSync(sqlPath, 'utf8')
    for (const raw of sql.split(';')) {
      // Strip Prisma's "-- CreateTable" annotations; what is left is either a
      // statement or whitespace. Every semicolon in the committed migrations is
      // line-final and none appears inside a string literal, so splitting on
      // ";" is safe here - it is not a general-purpose SQL splitter.
      const statement = raw
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim()
      if (statement.length > 0) statements.push(statement)
    }
  }
  return statements
}

// Dynamic import, after DATABASE_URL has been rewritten above: a static import
// would be hoisted above the assignment and the client would open dev.db.
const { db } = await import('@/lib/db')

for (const statement of migrationStatements()) {
  await db.$executeRawUnsafe(statement)
}
