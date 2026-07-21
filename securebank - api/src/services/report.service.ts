import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { ReportType, ReportFormat } from '@prisma/client';

export async function createReport(
  title: string,
  type: ReportType,
  format: ReportFormat,
  generatedById: string,
) {
  return prisma.report.create({
    data: { title, type, format, status: 'GENERATING', generatedById },
    include: { generatedBy: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function listReports(generatedById: string, isAdmin: boolean) {
  return prisma.report.findMany({
    where:   isAdmin ? {} : { generatedById },
    orderBy: { createdAt: 'desc' },
    include: { generatedBy: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function getReportById(id: string) {
  const report = await prisma.report.findUnique({
    where:   { id },
    include: { generatedBy: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!report) throw new AppError('Report not found', 404);
  return report;
}

export async function markReportReady(id: string, filePath?: string) {
  return prisma.report.update({
    where: { id },
    data:  { status: 'READY', filePath: filePath ?? null },
  });
}

export async function deleteReport(id: string) {
  await getReportById(id);
  await prisma.report.delete({ where: { id } });
}
