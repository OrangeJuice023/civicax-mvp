/**
 * Public surface of the CivicaX workflow engine.
 *
 * Import from '@/lib/workflow'. The four functions below are the only
 * sanctioned way to change the state of a transaction:
 *
 *   submitCase()              file a new transaction
 *   executeTransition()       move it between workflow steps
 *   appendCaseEvent()         record something without moving it
 *   getAvailableTransitions() ask what the current actor may do next
 *
 * Nothing outside src/lib/workflow may write CaseEvent, AuditRecord, or the
 * step/status fields of Case. That restriction is what makes the audit chain
 * meaningful: one event and one chained audit record per state change, written
 * in the same transaction as the change itself.
 *
 * Every authorization rule here is enforced server-side inside a transaction.
 * getAvailableTransitions() shares its evaluator with executeTransition(), so
 * a greyed-out button in the UI and a refusal from the server always agree -
 * but the UI's copy is advisory, and the engine is the authority.
 *
 * The guard whitelist is exported so an administration screen can show which
 * prerequisites a workflow definition may reference. Guard NAMES live in the
 * database; guard BEHAVIOUR lives in reviewed code, and an unrecognised name
 * denies rather than passes (see guards.ts).
 */

export {
  appendCaseEvent,
  executeTransition,
  getAvailableTransitions,
  submitCase,
} from './engine'

export type {
  AppendCaseEventInput,
  AppendCaseEventResult,
  AvailableTransition,
  SubmitCaseInput,
  TransitionActor,
  TransitionInput,
  TransitionResult,
} from './engine'

export {
  WORKFLOW_ERROR_MESSAGES,
  WorkflowError,
  isWorkflowError,
} from './errors'
export type { WorkflowErrorCode } from './errors'

export { GUARDS, GUARD_NAMES, isKnownGuard, resolveGuard } from './guards'
export type { GuardClient, GuardContext, GuardFn, GuardOutcome } from './guards'
