import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateRiskInput, UpdateRiskInput, RiskFilterInput } from '../schemas/risk.schema';

export async function createRisk(input: CreateRiskInput, createdById: string) {
  return prisma.risk.create({
    data: {
      title:       input.title,
      description: input.description,
      category:    input.category ?? 'TECHNICAL',
      likelihood:  input.likelihood,
      impact:      input.impact,
      status:      input.status ?? 'OPEN',
      dueDate:     input.dueDate ? new Date(input.dueDate) : null,
      createdById,
      ownerId:     input.ownerId ?? null,
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      owner:     { select: { id: true, firstName: true, lastName: true, email: true } },
      controls:  { select: { id: true, title: true, controlRef: true, framework: true } },
    },
  });
}

export async function listRisks(filters: RiskFilterInput) {
  const { page, limit, search, ...where } = filters;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};
  if (where.status)   whereClause.status   = where.status;
  if (where.category) whereClause.category = where.category;
  if (where.likelihood) whereClause.likelihood = where.likelihood;
  if (where.impact)     whereClause.impact     = where.impact;
  if (search) {
    whereClause.OR = [
      { title:       { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.risk.count({ where: whereClause }),
    prisma.risk.findMany({
      where:   whereClause,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        owner:     { select: { id: true, firstName: true, lastName: true } },
        controls:  { select: { id: true, title: true, controlRef: true } },
      },
    }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getRiskById(id: string) {
  const risk = await prisma.risk.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      owner:     { select: { id: true, firstName: true, lastName: true, email: true } },
      controls:  { select: { id: true, title: true, controlRef: true, framework: true, status: true } },
    },
  });
  if (!risk) throw new AppError('Risk not found', 404);
  return risk;
}

export async function updateRisk(id: string, input: UpdateRiskInput) {
  await getRiskById(id);
  return prisma.risk.update({
    where: { id },
    data: {
      ...(input.title       !== undefined && { title:       input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category    !== undefined && { category:    input.category }),
      ...(input.likelihood  !== undefined && { likelihood:  input.likelihood }),
      ...(input.impact      !== undefined && { impact:      input.impact }),
      ...(input.status      !== undefined && { status:      input.status }),
      ...(input.ownerId     !== undefined && { ownerId:     input.ownerId }),
      ...(input.dueDate     !== undefined && { dueDate:     input.dueDate ? new Date(input.dueDate) : null }),
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      owner:     { select: { id: true, firstName: true, lastName: true } },
      controls:  { select: { id: true, title: true, controlRef: true } },
    },
  });
}

export async function deleteRisk(id: string) {
  await getRiskById(id);
  await prisma.risk.delete({ where: { id } });
}

export async function getRiskHeatmap() {
  const risks = await prisma.risk.findMany({
    select: { likelihood: true, impact: true, status: true },
  });

  const cells: Record<string, { likelihood: number; impact: number; count: number; statuses: string[] }> = {};

  for (const r of risks) {
    const key = `${r.likelihood}-${r.impact}`;
    if (!cells[key]) {
      cells[key] = { likelihood: r.likelihood, impact: r.impact, count: 0, statuses: [] };
    }
    cells[key].count++;
    cells[key].statuses.push(r.status);
  }

  return Object.values(cells);
}

export async function getRiskSummary() {
  const [total, critical] = await prisma.$transaction([
    prisma.risk.count(),
    prisma.risk.count({ where: { likelihood: { gte: 4 }, impact: { gte: 4 } } }),
  ]);

  const statuses  = ['OPEN', 'IN_PROGRESS', 'MITIGATED', 'ACCEPTED', 'CLOSED'] as const;
  const categories = ['TECHNICAL', 'OPERATIONAL', 'COMPLIANCE', 'FINANCIAL', 'REPUTATIONAL', 'STRATEGIC'] as const;

  const statusCounts = await Promise.all(
    statuses.map((s) => prisma.risk.count({ where: { status: s } }).then((n) => [s, n] as const))
  );
  const categoryCounts = await Promise.all(
    categories.map((c) => prisma.risk.count({ where: { category: c } }).then((n) => [c, n] as const))
  );

  return {
    total,
    critical,
    byStatus:   Object.fromEntries(statusCounts),
    byCategory: Object.fromEntries(categoryCounts),
  };
}

export async function getRiskTrend() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // Pre-fill all 6 months with zeros so the chart always shows a full range
  const months: Record<string, { month: string; critical: number; high: number; medium: number; low: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en', { month: 'short' });
    months[key] = { month: label, critical: 0, high: 0, medium: 0, low: 0 };
  }

  const risks = await prisma.risk.findMany({
    where:   { createdAt: { gte: sixMonthsAgo } },
    select:  { createdAt: true, likelihood: true, impact: true },
    orderBy: { createdAt: 'asc' },
  });

  for (const r of risks) {
    const d   = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) continue;
    const score = r.likelihood * r.impact;
    if (score >= 20)      months[key].critical++;
    else if (score >= 12) months[key].high++;
    else if (score >= 6)  months[key].medium++;
    else                  months[key].low++;
  }

  return Object.values(months);
}
