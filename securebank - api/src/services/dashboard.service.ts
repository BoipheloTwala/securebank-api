import { prisma } from '../config/database';

export async function getDashboardKPIs() {
  const [
    totalRisks,
    criticalRisks,
    openControls,
    pendingEvidence,
    totalControls,
  ] = await prisma.$transaction([
    prisma.risk.count(),
    prisma.risk.count({ where: { likelihood: { gte: 4 }, impact: { gte: 4 } } }),
    prisma.control.count({ where: { status: { not: 'IMPLEMENTED' } } }),
    prisma.evidence.count({ where: { status: 'PENDING' } }),
    prisma.control.count(),
  ]);

  const implementedControls = await prisma.control.count({ where: { status: 'IMPLEMENTED' } });
  const complianceScore = totalControls > 0
    ? Math.round((implementedControls / totalControls) * 100)
    : 0;

  const highRisks = await prisma.risk.count({
    where: {
      OR: [
        { likelihood: { gte: 4 }, impact: { gte: 3 } },
        { likelihood: { gte: 3 }, impact: { gte: 4 } },
      ],
      NOT: { likelihood: { gte: 4 }, impact: { gte: 4 } },
    },
  });

  return {
    total_risks:       totalRisks,
    critical_risks:    criticalRisks,
    high_risks:        highRisks,
    open_controls:     openControls,
    compliance_score:  complianceScore,
    evidence_pending:  pendingEvidence,
    risks_trend:       0,
    compliance_trend:  0,
  };
}

export async function getRecentActivity(limit = 10) {
  const [recentRisks, recentEvidence, recentControls] = await prisma.$transaction([
    prisma.risk.findMany({
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select:  { id: true, title: true, createdAt: true, createdBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.evidence.findMany({
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select:  { id: true, title: true, createdAt: true, uploadedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.control.findMany({
      take:    limit,
      orderBy: { updatedAt: 'desc' },
      select:  { id: true, title: true, updatedAt: true, status: true },
    }),
  ]);

  const activities = [
    ...recentRisks.map((r) => ({
      id:      r.id,
      type:    'risk_created',
      message: `Risk "${r.title}" created`,
      user:    `${r.createdBy.firstName} ${r.createdBy.lastName}`,
      time:    r.createdAt,
    })),
    ...recentEvidence.map((e) => ({
      id:      e.id,
      type:    'evidence_added',
      message: `Evidence "${e.title}" uploaded`,
      user:    `${e.uploadedBy.firstName} ${e.uploadedBy.lastName}`,
      time:    e.createdAt,
    })),
    ...recentControls.map((c) => ({
      id:      c.id,
      type:    'control_updated',
      message: `Control "${c.title}" is ${c.status.toLowerCase().replace('_', ' ')}`,
      user:    'System',
      time:    c.updatedAt,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit)
    .map((a) => ({
      ...a,
      time: formatTimeAgo(new Date(a.time)),
    }));

  return activities;
}

export async function getComplianceScore() {
  const frameworks = ['ISO27001', 'PCIDSS', 'NISTCSF', 'SOX', 'ISO22301', 'GDPR'] as const;

  const scores = await Promise.all(
    frameworks.map(async (framework) => {
      const [total, implemented] = await prisma.$transaction([
        prisma.control.count({ where: { framework } }),
        prisma.control.count({ where: { framework, status: 'IMPLEMENTED' } }),
      ]);
      return {
        framework,
        score: total > 0 ? Math.round((implemented / total) * 100) : 0,
        total,
        implemented,
      };
    })
  );

  return scores.filter((s) => s.total > 0);
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
