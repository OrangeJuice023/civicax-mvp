'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { StatusPill } from '@/components/ui/status'
import { formatPeso, formatPercent, projectStatusLabel, milestoneStatusLabel } from '@/lib/infrastructure/labels'

export type ProjectRow = {
  id: string
  projectId: string
  name: string
  category: string
  location: string
  city: string
  budget: number
  progress: number
  status: string
  updatedAt: string
  currentMilestone: { name: string; status: string } | null
}

/**
 * Client-side search + status/category filter over the projects table. Every
 * control here actually narrows the visible rows - there is no pagination
 * control rendered, because none is implemented (see section 13/49 of the
 * hardening pass: never imply a control that does not work).
 */
export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [category, setCategory] = useState('ALL')

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows])
  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (status !== 'ALL' && r.status !== status) return false
      if (category !== 'ALL' && r.category !== category) return false
      if (!q) return true
      return (
        r.projectId.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
      )
    })
  }, [rows, search, status, category])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search project, name or location…"
          className="min-w-0 flex-1 rounded border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-ink"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-hairline bg-surface-1 px-2 py-1.5 text-xs text-ink outline-none focus:border-ink"
        >
          <option value="ALL">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{projectStatusLabel(s)}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-hairline bg-surface-1 px-2 py-1.5 text-xs text-ink outline-none focus:border-ink"
        >
          <option value="ALL">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-2">Project ID</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2 text-right">Budget</th>
              <th className="px-4 py-2 text-right">Progress</th>
              <th className="px-4 py-2">Current milestone</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((project) => (
              <tr key={project.id} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                <td className="px-4 py-2">
                  <Link href={`/projects/${project.projectId}`} className="font-medium text-ink hover:underline">
                    {project.projectId}
                  </Link>
                </td>
                <td className="px-4 py-2 text-ink">{project.name}</td>
                <td className="px-4 py-2 text-muted">{project.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-2 text-muted">{project.city}</td>
                <td className="px-4 py-2 text-right font-mono text-ink">{formatPeso(project.budget)}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-ink" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="font-mono text-ink">{formatPercent(project.progress)}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  {project.currentMilestone ? (
                    <div className="space-y-0.5">
                      <div className="text-ink-secondary">{project.currentMilestone.name}</div>
                      <StatusPill status={project.currentMilestone.status} label={milestoneStatusLabel(project.currentMilestone.status)} />
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={project.status} label={projectStatusLabel(project.status)} />
                </td>
                <td className="px-4 py-2 text-[11px] text-muted">{new Date(project.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">
                  No projects match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2 text-[11px] text-muted">
        <span>{filtered.length} of {rows.length} projects</span>
      </footer>
    </div>
  )
}
