import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateControlInput, UpdateControlInput, ControlFilterInput } from '../schemas/control.schema';

const include = {
  risks:    { select: { id: true, title: true, status: true, likelihood: true, impact: true } },
  evidence: { select: { id: true, title: true, status: true, type: true } },
};

export async function createControl(input: CreateControlInput) {
  return prisma.control.create({
    data: {
      title:         input.title,
      description:   input.description,
      framework:     input.framework ?? 'ISO27001',
      controlRef:    input.controlRef,
      status:        input.status ?? 'NOT_STARTED',
      effectiveness: input.effectiveness ?? 0,
      ...(input.riskIds?.length && {
        risks: { connect: input.riskIds.map((id) => ({ id })) },
      }),
    },
    include,
  });
}

export async function listControls(filters: ControlFilterInput) {
  const { page, limit, search, ...where } = filters;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};
  if (where.framework) whereClause.framework = where.framework;
  if (where.status)    whereClause.status    = where.status;
  if (search) {
    whereClause.OR = [
      { title:      { contains: search, mode: 'insensitive' } },
      { controlRef: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.control.count({ where: whereClause }),
    prisma.control.findMany({
      where:   whereClause,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      include,
    }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getControlById(id: string) {
  const control = await prisma.control.findUnique({ where: { id }, include });
  if (!control) throw new AppError('Control not found', 404);
  return control;
}

export async function updateControl(id: string, input: UpdateControlInput) {
  await getControlById(id);
  return prisma.control.update({
    where: { id },
    data: {
      ...(input.title         !== undefined && { title:         input.title }),
      ...(input.description   !== undefined && { description:   input.description }),
      ...(input.framework     !== undefined && { framework:     input.framework }),
      ...(input.controlRef    !== undefined && { controlRef:    input.controlRef }),
      ...(input.status        !== undefined && { status:        input.status }),
      ...(input.effectiveness !== undefined && { effectiveness: input.effectiveness }),
      ...(input.riskIds !== undefined && {
        risks: { set: input.riskIds.map((id) => ({ id })) },
      }),
    },
    include,
  });
}

export async function deleteControl(id: string) {
  await getControlById(id);
  await prisma.control.delete({ where: { id } });
}

export async function linkRiskToControl(controlId: string, riskId: string) {
  await getControlById(controlId);
  const risk = await prisma.risk.findUnique({ where: { id: riskId } });
  if (!risk) throw new AppError('Risk not found', 404);
  return prisma.control.update({
    where: { id: controlId },
    data:  { risks: { connect: { id: riskId } } },
    include,
  });
}

export async function unlinkRiskFromControl(controlId: string, riskId: string) {
  await getControlById(controlId);
  return prisma.control.update({
    where: { id: controlId },
    data:  { risks: { disconnect: { id: riskId } } },
    include,
  });
}

export async function getControlSummary() {
  const total = await prisma.control.count();

  const frameworks = ['ISO27001', 'PCIDSS', 'NISTCSF', 'SOX', 'ISO22301', 'GDPR'] as const;
  const statuses   = ['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'DEPRECATED'] as const;

  const byFramework = await Promise.all(
    frameworks.map(async (fw) => {
      const [count, agg] = await prisma.$transaction([
        prisma.control.count({ where: { framework: fw } }),
        prisma.control.aggregate({ where: { framework: fw }, _avg: { effectiveness: true } }),
      ]);
      return {
        framework:        fw,
        count,
        avgEffectiveness: Math.round(agg._avg.effectiveness ?? 0),
      };
    })
  );

  const statusCounts = await Promise.all(
    statuses.map((s) => prisma.control.count({ where: { status: s } }).then((n) => [s, n] as const))
  );

  return {
    total,
    byFramework: byFramework.filter((f) => f.count > 0),
    byStatus:    Object.fromEntries(statusCounts),
  };
}
