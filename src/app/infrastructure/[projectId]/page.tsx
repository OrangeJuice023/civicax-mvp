import { redirect } from 'next/navigation'

/**
 * /infrastructure/[id] is a legacy route. Canonical detail lives at
 * /projects/[id], so redirect old links there, preserving the id - a
 * bookmarked or shared /infrastructure/PRJ-00026 link must land on the same
 * project, not on the generic projects list.
 */
export default async function InfrastructureProjectRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  redirect(`/projects/${projectId}`)
}
