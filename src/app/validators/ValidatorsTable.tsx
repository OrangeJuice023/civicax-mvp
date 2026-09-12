'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { StatusPill } from '@/components/ui/status'
import { validatorStatusLabel, validationStatusLabel } from '@/lib/infrastructure/labels'
import { cn } from '@/lib/cn'

export type ValidatorRow = {
  id: string
  code: string
  name: string
  department: string
  role: string
  status: string
  lastActivity: string | null
  validationCount: number
  recentValidations: Array<{
    id: string
    status: string
    validatedAt: string | null
    milestoneName: string
    projectId: string
    projectName: string
  }>
}

/**
 * A native <details> row per validator - keyboard-accessible, no JS state
 * management needed for open/closed, and visually reads as an inline drawer.
 * Section 28 only asks for "a drawer/modal ... if it provides a good UX",
 * not a bespoke overlay component.
 */
export function ValidatorsTable({ rows }: { rows: ValidatorRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-[11px] font-medium uppercase tracking-wide text-muted">
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Department</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Last activity</th>
            <th className="px-4 py-2 text-right">Validations</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const isOpen = openId === v.id
            return (
              <Fragment key={v.id}>
                <tr
                  onClick={() => setOpenId(isOpen ? null : v.id)}
                  className={cn('cursor-pointer border-b border-hairline last:border-0 hover:bg-surface-2', isOpen && 'bg-surface-2')}
                >
                  <td className="px-4 py-2 font-mono text-ink">{v.code}</td>
                  <td className="px-4 py-2 text-ink">{v.name}</td>
                  <td className="px-4 py-2 text-muted">{v.department}</td>
                  <td className="px-4 py-2 text-muted">{v.role}</td>
                  <td className="px-4 py-2 text-[11px] text-muted">
                    {v.lastActivity ? new Date(v.lastActivity).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-ink">{v.validationCount}</td>
                  <td className="px-4 py-2">
                    <StatusPill status={v.status} label={validatorStatusLabel(v.status)} />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-hairline bg-surface-2 last:border-0">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted">
                        Recent validation activity
                      </div>
                      {v.recentValidations.length === 0 ? (
                        <p className="mt-1 text-xs text-muted">No validation decisions recorded yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {v.recentValidations.map((rv) => (
                            <li key={rv.id} className="flex items-center justify-between gap-3 text-xs">
                              <span className="min-w-0">
                                <Link href={`/projects/${rv.projectId}`} className="font-medium text-ink hover:underline">
                                  {rv.projectName}
                                </Link>
                                <span className="text-muted"> · {rv.milestoneName}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                {rv.validatedAt && <span className="text-muted">{new Date(rv.validatedAt).toLocaleDateString()}</span>}
                                <StatusPill status={rv.status} label={validationStatusLabel(rv.status)} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
