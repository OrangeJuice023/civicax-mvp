import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { Card, CardHeader } from '@/components/ui/primitives'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { pickCurrentMilestone } from '@/lib/infrastructure/labels'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { AppShell } from '@/components/AppShell'
import { ProjectsTable, type ProjectRow } from './ProjectsTable'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // The shell's search box navigates here with ?q=, so the query survives a
  // reload and can be shared as a link rather than living only in component
  // state.
  const { q } = await searchParams

  const [user, projects, pendingActionsCount] = await Promise.all([
    readSession(),
    db.project.findMany({
      include: {
        office: { select: { id: true, code: true, name: true, shortName: true } },
        milestones: { orderBy: { sequence: 'asc' }, select: { name: true, status: true } },
      },
      orderBy: { projectId: 'asc' },
    }),
    getPendingActionsCount(),
  ])

  const rows: ProjectRow[] = projects.map((project) => {
    const current = pickCurrentMilestone(project.milestones)
    return {
      id: project.id,
      projectId: project.projectId,
      name: project.name,
      category: project.category,
      sector: project.sector,
      location: project.location,
      city: project.city,
      budget: project.budget,
      progress: project.progress,
      status: project.status,
      updatedAt: project.updatedAt.toISOString(),
      currentMilestone: current ? { name: current.name, status: current.status } : null,
    }
  })

  return (
    <AppShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Projects</h1>
        <p className="mt-0.5 text-xs text-muted">
          {rows.length} projects under monitoring. Open one to see its milestones, evidence, validation and audit
          trail.
        </p>
      </div>
      <Card className="overflow-hidden">
        <CardHeader
          title="Project portfolio"
          description="Synthetic demonstration projects. Click a row to open the project detail."
          actions={<ProvenanceBadge classification="SYNTHETIC_DEMO" />}
        />
        <ProjectsTable rows={rows} initialSearch={q ?? ''} />
      </Card>
    </AppShell>
  )
}
