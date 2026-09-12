import { redirect } from 'next/navigation'

/**
 * /infrastructure is a legacy route. The canonical hierarchy is
 * / → /dashboard → /projects → /projects/[id], so send old links here.
 */
export default function InfrastructureRedirect() {
  redirect('/dashboard')
}