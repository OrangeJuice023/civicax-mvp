'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleDashed, AlertTriangle } from 'lucide-react'
import { StatusPill } from '@/components/ui/status'
import { cn } from '@/lib/cn'
import {
  milestoneStatusLabel,
  evidenceStatusLabel,
  validationStatusLabel,
  computeMilestoneReadiness,
} from '@/lib/infrastructure/labels'

type Milestone = {
  id: string
  name: string
  code: string
  description: string | null
  status: string
  progress: number
  targetDate: Date | null
  submittedAt: Date | null
  approvedAt: Date | null
  approvedBy: string | null
  evidence: Array<{
    id: string
    type: string
    title: string
    description: string | null
    status: string
    submittedBy: string | null
    submittedAt: Date | null
    verifiedAt: Date | null
    verifiedBy: string | null
    source: string | null
    fileRef: string | null
    latitude: number | null
    longitude: number | null
    accuracyM: number | null
    capturedAt: Date | null
  }>
  validations: Array<{
    id: string
    milestoneId: string
    validatorId: string
    department: string
    role: string
    status: string
    required: boolean
    note: string | null
    validatedAt: Date | null
    createdAt: Date
    validator: {
      id: string
      code: string
      name: string
      department: string
      role: string
      status: string
    }
  }>
}

const MILESTONE_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  COMPLETED: CheckCircle2,
  APPROVED: CheckCircle2,
  PENDING_APPROVAL: CircleDashed,
  BLOCKED_ON_VALIDATION: AlertTriangle,
  BLOCKED_ON_EVIDENCE: AlertTriangle,
}

function MilestoneIcon({ status }: { status: string }) {
  const Icon = MILESTONE_ICONS[status] ?? CircleDashed
  return <Icon className="size-4 shrink-0" />
}

export function MilestoneReadiness({
  milestone,
  internal,
  projectId,
  canValidate,
  canApprove,
}: {
  milestone: Milestone
  internal: boolean
  projectId: string
  /** Server-computed: true only when this signed-in caller's role/office is one policy.ts grants 'project:complete-validation' to on THIS project. The API re-checks regardless - this only decides whether the button is worth showing. */
  canValidate: boolean
  /** Same, for 'project:approve-milestone'. */
  canApprove: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readiness = computeMilestoneReadiness(milestone)
  const pendingValidation = milestone.validations.find((v) => v.required && v.status === 'PENDING')

  async function completeValidation() {
    if (!pendingValidation) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/infrastructure/${projectId}/milestones/${milestone.id}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ validatorCode: pendingValidation.validator.code, decision: 'APPROVED' }),
        },
      )
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Validation could not be recorded.')
        setPending(false)
        return
      }
      router.refresh()
    } catch {
      setError('Validation could not be recorded. Check your connection and try again.')
      setPending(false)
    }
  }

  async function approve() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/infrastructure/${projectId}/milestones/${milestone.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Approval could not be recorded.')
        setPending(false)
        return
      }
      router.refresh()
    } catch {
      setError('Approval could not be recorded. Check your connection and try again.')
      setPending(false)
    }
  }

  const showValidateButton = canValidate && milestone.status === 'BLOCKED_ON_VALIDATION' && !!pendingValidation
  const showApproveButton = canApprove && milestone.status === 'PENDING_APPROVAL'

  return (
    <section className="rounded-lg border border-hairline bg-surface-1">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <MilestoneIcon status={milestone.status} />
            <h3 className="text-sm font-semibold tracking-tight text-ink">
              {milestone.code} · {milestone.name}
            </h3>
            <StatusPill status={milestone.status} label={milestoneStatusLabel(milestone.status)} />
          </div>
          {milestone.description && <p className="text-xs text-ink-secondary">{milestone.description}</p>}
        </div>
      </header>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <div className="text-muted">Evidence</div>
            <div className="ca-numeric font-medium text-ink">
              {readiness.evidenceVerified} / {readiness.evidenceTotal} verified
            </div>
          </div>
          <div>
            <div className="text-muted">Validations</div>
            <div className="ca-numeric font-medium text-ink">
              {readiness.validationsApproved} / {readiness.validationsRequired} complete
            </div>
          </div>
          <div>
            <div className="text-muted">Progress</div>
            <div className="ca-numeric font-medium text-ink">{milestone.progress}%</div>
          </div>
          <div>
            <div className="text-muted">Target</div>
            <div className="ca-numeric font-medium text-ink">
              {milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>

        {readiness.isBlocked && pendingValidation && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-critical bg-critical-subtle px-3 py-2 text-xs">
            <div>
              <span className="font-medium text-ink">Blocking item: </span>
              <span className="text-ink-secondary">{pendingValidation.role} validation pending.</span>
              <div className="mt-0.5 text-ink-secondary">
                <span className="font-medium text-ink">Current owner: </span>
                {pendingValidation.validator.name}
              </div>
            </div>
          </div>
        )}

        {milestone.status === 'PENDING_APPROVAL' && (
          <div className="rounded border border-hairline bg-surface-2 px-3 py-2 text-xs text-ink-secondary">
            <span className="font-medium text-ink">Next action: </span>
            Approve this milestone. Every required validation is complete.
          </div>
        )}

        {milestone.evidence.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-ink">Evidence</h4>
            <ul className="mt-1 space-y-1">
              {milestone.evidence.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink-secondary">{e.title}</span>
                  <StatusPill status={e.status} label={evidenceStatusLabel(e.status)} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {milestone.validations.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-ink">Validations</h4>
            <ul className="mt-1 space-y-1">
              {milestone.validations.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink-secondary">
                    {internal ? v.validator.name : v.validator.code}
                    {v.note && <span className="text-muted"> — {v.note}</span>}
                  </span>
                  <StatusPill status={v.status} label={validationStatusLabel(v.status)} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded border border-critical bg-critical-subtle px-3 py-2 text-xs text-ink">
            {error}
          </p>
        )}

        {(showValidateButton || showApproveButton) && (
          <div className="flex justify-end gap-2 border-t border-hairline pt-3">
            {showValidateButton && (
              <button
                type="button"
                onClick={completeValidation}
                disabled={pending}
                className={cn(
                  'rounded bg-ink px-3 py-1.5 text-xs font-medium text-ink-inverse hover:opacity-90',
                  pending && 'cursor-not-allowed opacity-60',
                )}
              >
                {pending ? 'Recording…' : 'Complete Validation'}
              </button>
            )}
            {showApproveButton && (
              <button
                type="button"
                onClick={approve}
                disabled={pending}
                className={cn(
                  'rounded bg-ink px-3 py-1.5 text-xs font-medium text-ink-inverse hover:opacity-90',
                  pending && 'cursor-not-allowed opacity-60',
                )}
              >
                {pending ? 'Recording…' : 'Approve Milestone'}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
