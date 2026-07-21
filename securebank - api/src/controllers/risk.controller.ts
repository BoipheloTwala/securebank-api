import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response.utils';
import { createRiskSchema, updateRiskSchema, riskFilterSchema } from '../schemas/risk.schema';
import {
  createRisk, listRisks, getRiskById, updateRisk, deleteRisk,
  getRiskHeatmap, getRiskSummary, getRiskTrend,
} from '../services/risk.service';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createRiskSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user.id;
    const risk = await createRisk(input, userId);
    sendCreated(res, risk, 'Risk created');
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = riskFilterSchema.parse(req.query);
    const result = await listRisks(filters);
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    sendSuccess(res, result.items, 'Risks retrieved', 200, meta);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const risk = await getRiskById(req.params.id as string);
    sendSuccess(res, risk, 'Risk retrieved');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateRiskSchema.parse(req.body);
    const risk = await updateRisk(req.params.id as string, input);
    sendSuccess(res, risk, 'Risk updated');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteRisk(req.params.id as string);
    sendSuccess(res, null, 'Risk deleted');
  } catch (err) { next(err); }
}

export async function heatmap(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getRiskHeatmap();
    sendSuccess(res, data, 'Heatmap data retrieved');
  } catch (err) { next(err); }
}

export async function summary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getRiskSummary();
    sendSuccess(res, data, 'Risk summary retrieved');
  } catch (err) { next(err); }
}

export async function trend(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getRiskTrend();
    sendSuccess(res, data, 'Risk trend retrieved');
  } catch (err) { next(err); }
}
