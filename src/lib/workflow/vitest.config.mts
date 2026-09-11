/**
 * Vitest configuration for the workflow engine tests.
 *
 * This config lives inside src/lib/workflow rather than at the repository root
 * because the root belongs to the project as a whole, and this module owns
 * only src/lib/workflow and src/lib/audit. Vitest auto-discovers a config only
 * at the root, so run these tests explicitly:
 *
 *   npx vitest run --config src/lib/workflow/vitest.config.mts
 *
 * The .mts extension is not cosmetic: the nearest package.json has no
 * "type": "module", so a .ts config would be loaded as CommonJS and Vite warns
 * about the ESM syntax in it.
 *
 * If a root vitest.config is added later, these tests need two things from it
 * to run under plain `npx vitest`: the "@" -> src alias (engine.ts imports
 * '@/lib/db', following the project convention) and the setupFiles entry
 * below, which redirects DATABASE_URL at a throwaway database. Without the
 * setup file the tests would run against dev.db and overwrite the demo data.
 */

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(here, '..', '..', '..')

export default defineConfig({
  // Vite would otherwise treat this file's own directory as the project root,
  // and the alias and include globs below would resolve against the wrong base.
  root: projectRoot,
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/workflow/**/*.test.ts'],
    setupFiles: [resolve(projectRoot, 'src/lib/workflow/engine.test.setup.ts')],
    // One SQLite file, shared by the whole run, plus a Prisma client cached on
    // globalThis. Parallel workers would each recreate the schema in that same
    // file and trample each other's rows. These tests are I/O-bound against a
    // local file and finish in about a second, so serial execution costs
    // nothing worth having.
    fileParallelism: false,
  },
})
