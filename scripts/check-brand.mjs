#!/usr/bin/env node
/**
 * Rebrand guard: fails if an ACTIVE, brand-facing file still says "CivicaX"
 * (or a spacing/casing variant of it).
 *
 * This intentionally does NOT scan the whole repository - only the surfaces
 * that are supposed to be 100% Kawing now. It skips, on purpose:
 *   - prisma/migrations/**    (historical schema-change record, never rebranded)
 *   - docs/brand-transition.md (exists specifically to document the old name)
 *   - node_modules, .next, .git, dev.db, package-lock.json
 *
 * A hit anywhere else means an active brand reference survived the rebrand
 * pass and needs a look - either rename it, or if it is genuinely historical/
 * provenance content, add it to ALLOWED_FILES below with a comment saying why.
 *
 * Usage: node scripts/check-brand.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.kilo', 'prisma/migrations'])
const SKIP_FILES = new Set(['package-lock.json', 'dev.db', 'tsconfig.tsbuildinfo'])
/** Files allowed to mention the former name because they ARE the historical record. */
const ALLOWED_FILES = new Set(['docs/brand-transition.md', 'README.md', 'scripts/check-brand.mjs'])

const PATTERN = /civica[\s_-]*x/i

function shouldSkipDir(relPath) {
  const normalized = relPath.split(sep).join('/')
  for (const skip of SKIP_DIRS) {
    if (normalized === skip || normalized.startsWith(skip + '/')) return true
  }
  return false
}

function walk(dir, hits) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full)
    if (shouldSkipDir(rel)) continue
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, hits)
      continue
    }
    if (SKIP_FILES.has(entry)) continue
    const relPosix = rel.split(sep).join('/')
    if (ALLOWED_FILES.has(relPosix)) continue
    if (!/\.(ts|tsx|js|mjs|cjs|json|md|css)$/.test(entry)) continue

    let content
    try {
      content = readFileSync(full, 'utf8')
    } catch {
      continue
    }
    const lines = content.split('\n')
    lines.forEach((line, i) => {
      if (PATTERN.test(line)) {
        hits.push({ file: relPosix, line: i + 1, text: line.trim().slice(0, 120) })
      }
    })
  }
}

const hits = []
walk(ROOT, hits)

if (hits.length > 0) {
  console.error(`Found ${hits.length} active brand reference(s) to the former name:\n`)
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line}: ${hit.text}`)
  }
  console.error(
    '\nRename each to Kawing, or if it is genuinely historical/migration/provenance content, add it to ALLOWED_FILES in scripts/check-brand.mjs with a comment explaining why.',
  )
  process.exit(1)
}

console.log('Brand check passed: no active CivicaX references found outside prisma/migrations/, docs/brand-transition.md, and README.md.')
