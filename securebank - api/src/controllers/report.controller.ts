import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated } from '../utils/response.utils';
import { AppError } from '../middleware/error.middleware';
import { ReportType, ReportFormat, Role } from '@prisma/client';
import {
  createReport, listReports, getReportById, markReportReady, deleteReport,
} from '../services/report.service';
import { prisma } from '../config/database';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

async function generateStubFile(reportId: string, type: ReportType, format: ReportFormat): Promise<string> {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const risks    = await prisma.risk.findMany({ select: { title: true, category: true, likelihood: true, impact: true, status: true } });
  const controls = await prisma.control.findMany({ select: { title: true, framework: true, controlRef: true, status: true, effectiveness: true } });

  const content = JSON.stringify({
    report:    { id: reportId, type, format, generatedAt: new Date().toISOString() },
    risks:     type === 'RISK'      ? risks    : undefined,
    controls:  type === 'CONTROLS'  ? controls : undefined,
    summary:   { totalRisks: risks.length, totalControls: controls.length },
  }, null, 2);

  const fileName = `report-${reportId}.json`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

export async function generate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, type, format } = req.body;
    if (!type || !Object.values(ReportType).includes(type)) throw new AppError('Invalid report type', 400);
    const fmt: ReportFormat = Object.values(ReportFormat).includes(format) ? format : 'PDF';
    const userId = (req as AuthenticatedRequest).user.id;
    const reportTitle = title || `${type} Report — ${new Date().toLocaleDateString()}`;
    const report = await createReport(reportTitle, type as ReportType, fmt, userId);

    // Generate stub file and mark ready in the background
    generateStubFile(report.id, type as ReportType, fmt)
      .then((filePath) => markReportReady(report.id, filePath))
      .catch(() => markReportReady(report.id));

    sendCreated(res, report, 'Report generation started');
  } catch (err) { next(err); }
}

export async function download(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await getReportById(req.params.id as string);
    if (!report.filePath || !fs.existsSync(report.filePath)) {
      throw new AppError('Report file not ready yet', 404);
    }
    const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    res.download(report.filePath, fileName);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const isAdmin = user.role === Role.ADMIN;
    const reports = await listReports(user.id, isAdmin);
    sendSuccess(res, reports, 'Reports retrieved');
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await getReportById(req.params.id as string);
    sendSuccess(res, report, 'Report retrieved');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteReport(req.params.id as string);
    sendSuccess(res, null, 'Report deleted');
  } catch (err) { next(err); }
}
