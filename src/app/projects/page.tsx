import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { Card, CardHeader } from '@/components/ui/primitives'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { DashboardShell } from '../dashboard/DashboardShell'
import { ProjectsTable, type ProjectRow } from './ProjectsTable'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const [user, projects, pendingActionsCount] = await Promise.all([
    readSession(),
    db.project.findMany({
      include: {
        office: { select: { id: true, code: true, name: true, shortName: true } },
        milestones: { orderBy: { sequence: 'asc' }, take: 1, where: { NOT: { status: 'DRAFT' } } },
      },
      orderBy: { projectId: 'asc' },
    }),
    getPendingActionsCount(),
  ])

  const rows: ProjectRow[] = projects.map((project) => ({
    id: project.id,
    projectId: project.projectId,
    name: project.name,
    category: project.category,
    location: project.location,
    city: project.city,
    budget: project.budget,
    progress: project.progress,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
    currentMilestone: project.milestones[0]
      ? { name: project.milestones[0].name, status: project.milestones[0].status }
      : null,
  }))

  return (
    <DashboardShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
      <Card className="overflow-hidden">
        <CardHeader
          title="Projects"
          description="All synthetic demonstration projects. Click a row to open the project detail."
          actions={<ProvenanceBadge classification="SYNTHETIC_DEMO" />}
        />
        <ProjectsTable rows={rows} />
      </Card>
    </DashboardShell>
  )
}
