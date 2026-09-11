/**
 * Workflow failures.
 *
 * There is exactly one error class with a closed set of codes, rather than a
 * class hierarchy, for two reasons:
 *
 *   1. The codes are the API. A Server Action or route handler maps a code to
 *      an HTTP status and a message; the UI branches on the code. A closed
 *      union means TypeScript catches an unhandled case at compile time.
 *   2. Refusals must be indistinguishable from the outside. ROLE_NOT_PERMITTED
 *      and OFFICE_MISMATCH are separate codes because the acting officer needs
 *      to know which rule stopped them, but nothing here leaks case contents.
 *
 * `detail` carries the specifics for the officer and the server log (which
 * transition, which office, which guard). Keep applicant personal data out of
 * it: `detail` is rendered in the UI and written to logs, and neither is a
 * place for citizen data that the reader may not be entitled to see.
 *
 * Authorization codes are raised by the engine, SERVER-SIDE, before any write.
 * The UI's greying-out of unavailable actions (getAvailableTransitions) is a
 * convenience only - the engine re-checks every rule and is the only authority.
 */

export type WorkflowErrorCode =
  /** No case with that id. */
  | 'CASE_NOT_FOUND'
  /** The case has already left the workflow (COMPLETED / REJECTED / CANCELLED). */
  | 'CASE_TERMINAL'
  /** No WorkflowTransition exists for (definition, current step, action[, target]). */
  | 'TRANSITION_NOT_ALLOWED'
  /** The actor's role is not the transition's requiredRole. */
  | 'ROLE_NOT_PERMITTED'
  /** The actor's office is not the office the case is currently sitting at. */
  | 'OFFICE_MISMATCH'
  /** A declarative guard denied the transition, or named a guard that does not exist. */
  | 'GUARD_FAILED'
  /** The workflow definition itself is inconsistent - a configuration bug, not a user error. */
  | 'DEFINITION_INVALID'

export class WorkflowError extends Error {
  readonly code: WorkflowErrorCode
  readonly detail?: string

  constructor(code: WorkflowErrorCode, message: string, detail?: string) {
    super(message)
    // Subclassing Error in code compiled to ES2017 (see tsconfig target) keeps
    // the prototype chain, but setting it explicitly makes `instanceof` robust
    // even if the target is lowered later or the class is re-thrown across a
    // bundler boundary.
    Object.setPrototypeOf(this, WorkflowError.prototype)
    this.name = 'WorkflowError'
    this.code = code
    this.detail = detail
  }
}

export function isWorkflowError(error: unknown): error is WorkflowError {
  return error instanceof WorkflowError
}

/**
 * Messages safe to show a user. Deliberately vague about internals: the UI
 * shows this plus, for officers and administrators only, `detail`.
 */
export const WORKFLOW_ERROR_MESSAGES: Record<WorkflowErrorCode, string> = {
  CASE_NOT_FOUND: 'That transaction could not be found.',
  CASE_TERMINAL: 'This transaction is already closed and cannot be changed.',
  TRANSITION_NOT_ALLOWED: 'That action is not available at this stage of the process.',
  ROLE_NOT_PERMITTED: 'Your role is not authorised to take that action.',
  OFFICE_MISMATCH: 'This transaction is currently with another office.',
  GUARD_FAILED: 'A prerequisite for that action has not been met.',
  DEFINITION_INVALID: 'The workflow for this service is misconfigured. Please report this.',
}
