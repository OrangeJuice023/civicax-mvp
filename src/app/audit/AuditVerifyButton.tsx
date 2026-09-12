'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type VerifyState = 'idle' | 'loading' | 'valid' | 'invalid'

export function AuditVerifyButton({ projectId }: { projectId: string }) {
  const [state, setState] = useState<VerifyState>('idle')
  const [detail, setDetail] = useState<string | null>(null)

  async function run() {
    if (!projectId) return
    setState('loading')
    setDetail(null)
    try {
      const res = await fetch(`/api/infrastructure/${projectId}/verify`, { method: 'POST' })
      const json = await res.json()
      if (json.valid) {
        setState('valid')
        setDetail(`Verified · ${json.recordCount} records`)
      } else {
        setState('invalid')
        setDetail(json.reason ?? 'Integrity error')
      }
    } catch {
      setState('invalid')
      setDetail('Verification failed')
    }
  }

  if (state === 'valid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-good bg-good-subtle px-2 py-0.5 text-xs font-medium text-ink">
        <CheckCircle2 className="size-3.5" /> {detail ?? 'Audit verified'}
      </span>
    )
  }
  if (state === 'invalid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-critical bg-critical-subtle px-2 py-0.5 text-xs font-medium text-ink" title={detail ?? undefined}>
        <AlertTriangle className="size-3.5" /> Integrity error
      </span>
    )
  }
  return (
    <button
      onClick={run}
      disabled={state === 'loading' || !projectId}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-hairline bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-secondary',
        'hover:bg-surface-1 hover:text-ink',
        (state === 'loading' || !projectId) && 'cursor-not-allowed opacity-50',
      )}
    >
      {state === 'loading' ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
      {state === 'loading' ? 'Verifying…' : 'Verify'}
    </button>
  )
}