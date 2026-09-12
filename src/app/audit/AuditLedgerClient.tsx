'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { infrastructureEventLabel } from '@/lib/infrastructure/labels'
import { AuditVerifyButton } from './AuditVerifyButton'

export type LedgerRow = {
  id: string
  sequence: number
  projectInternalId: string
  projectId: string
  projectName: string
  milestoneCode: string | null
  type: string
  actorLabel: string | null
  occurredAt: string
  hash: string | null
}

type Category = 'ALL' | 'MILESTONES' | 'BUDGET' | 'VALIDATION'

const CATEGORY_EVENT_TYPES: Record<Exclude<Category, 'ALL'>, readonly string[]> = {
  MILESTONES: ['MILESTONE_CREATED', 'MILESTONE_SUBMITTED', 'MILESTONE_STATUS_CHANGED', 'MILESTONE_APPROVED', 'MILESTONE_RETURNED', 'PROJECT_CREATED', 'PROJECT_STATUS_CHANGED', 'PROJECT_COMPLETED'],
  BUDGET: ['PAYMENT_ELIGIBLE', 'PAYMENT_RELEASED'],
  VALIDATION: ['VALIDATION_COMPLETED', 'VALIDATION_ESCALATED', 'EVIDENCE_SUBMITTED', 'EVIDENCE_VERIFIED', 'EVIDENCE_REJECTED'],
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'MILESTONES', label: 'Milestones' },
  { key: 'BUDGET', label: 'Budget' },
  { key: 'VALIDATION', label: 'Validation' },
]

/**
 * Client-side search + category filter over the ledger page the server
 * loaded. Filtering client-side is deliberate at this scale (a few hundred
 * rows, already fetched): every filter here actually narrows the visible
 * rows - there is no decorative control that does nothing when clicked.
 */
export function AuditLedgerClient({ rows, initialProjectFilter }: { rows: LedgerRow[]; initialProjectFilter: string }) {
  const [search, setSearch] = useState(initialProjectFilter)
  const [category, setCategory] = useState<Category>('ALL')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (category !== 'ALL' && !CATEGORY_EVENT_TYPES[category].includes(row.type)) return false
      if (!q) return true
      return (
        row.projectId.toLowerCase().includes(q) ||
        row.projectName.toLowerCase().includes(q) ||
        infrastructureEventLabel(row.type).toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q)
      )
    })
  }, [rows, search, category])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search project or event…"
          className="min-w-0 flex-1 rounded border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-ink"
        />
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`rounded px-2.5 py-1.5 text-xs font-medium ${
                category === c.key ? 'bg-ink text-ink-inverse' : 'bg-surface-2 text-ink-secondary hover:text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Milestone</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Hash</th>
              <th className="px-4 py-2">Verification</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2 font-mono text-ink">{row.sequence}</td>
                <td className="px-4 py-2">
                  <Link href={`/projects/${row.projectId}`} className="font-medium text-ink hover:underline">
                    {row.projectId}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted">{row.milestoneCode ?? '—'}</td>
                <td className="px-4 py-2 text-ink-secondary">{infrastructureEventLabel(row.type)}</td>
                <td className="px-4 py-2 text-muted">{row.actorLabel ?? '—'}</td>
                <td className="px-4 py-2 text-muted">{new Date(row.occurredAt).toLocaleString()}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-ink-secondary">
                  {(row.hash ?? '').slice(0, 12)}…
                </td>
                <td className="px-4 py-2">
                  <AuditVerifyButton projectId={row.projectInternalId} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                  No events match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
