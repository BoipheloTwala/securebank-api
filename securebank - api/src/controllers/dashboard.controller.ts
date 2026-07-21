import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.utils';
import { getDashboardKPIs, getRecentActivity, getComplianceScore } from '../services/dashboard.service';

export async function kpis(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDashboardKPIs();
    sendSuccess(res, data, 'Dashboard KPIs retrieved');
  } catch (err) { next(err); }
}

export async function activity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await getRecentActivity(limit);
    sendSuccess(res, data, 'Recent activity retrieved');
  } catch (err) { next(err); }
}

export async function complianceScore(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getComplianceScore();
    sendSuccess(res, data, 'Compliance scores retrieved');
  } catch (err) { next(err); }
}
