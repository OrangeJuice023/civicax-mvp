import { redirect } from 'next/navigation'

/**
 * CivicaX v0.1 lands on the infrastructure dashboard.
 *
 * The citizen-transaction Case domain keeps its own routes; this prototype's
 * public face is the oversight view of public-infrastructure projects. The
 * redirect lives here rather than in a config file so it stays visible next
 * to the layout that wraps it.
 */
export default function Home() {
  redirect('/infrastructure')
}