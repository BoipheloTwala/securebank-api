import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response.utils';
import { createControlSchema, updateControlSchema, controlFilterSchema, linkRiskSchema } from '../schemas/control.schema';
import {
  createControl, listControls, getControlById, updateControl, deleteControl,
  linkRiskToControl, unlinkRiskFromControl, getControlSummary,
} from '../services/control.service';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createControlSchema.parse(req.body);
    const control = await createControl(input);
    sendCreated(res, control, 'Control created');
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = controlFilterSchema.parse(req.query);
    const result = await listControls(filters);
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    sendSuccess(res, result.items, 'Controls retrieved', 200, meta);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const control = await getControlById(req.params.id as string);
    sendSuccess(res, control, 'Control retrieved');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateControlSchema.parse(req.body);
    const control = await updateControl(req.params.id as string, input);
    sendSuccess(res, control, 'Control updated');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteControl(req.params.id as string);
    sendSuccess(res, null, 'Control deleted');
  } catch (err) { next(err); }
}

export async function linkRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { riskId } = linkRiskSchema.parse(req.body);
    const control = await linkRiskToControl(req.params.id as string, riskId);
    sendSuccess(res, control, 'Risk linked to control');
  } catch (err) { next(err); }
}

export async function unlinkRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const control = await unlinkRiskFromControl(req.params.id as string, req.params.riskId as string);
    sendSuccess(res, control, 'Risk unlinked from control');
  } catch (err) { next(err); }
}

export async function frameworkSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getControlSummary();
    sendSuccess(res, data, 'Control summary retrieved');
  } catch (err) { next(err); }
}
