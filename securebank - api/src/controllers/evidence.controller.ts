import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response.utils';
import { AppError } from '../middleware/error.middleware';
import { updateEvidenceSchema, evidenceFilterSchema } from '../schemas/evidence.schema';
import {
  createEvidence, listEvidence, getEvidenceById,
  updateEvidence, deleteEvidence, getEvidenceFilePath,
} from '../services/evidence.service';

export async function upload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);
    const { title, controlId, notes } = req.body;
    if (!title) throw new AppError('Title is required', 400);
    const userId = (req as AuthenticatedRequest).user.id;
    const ev = await createEvidence(req.file, title, userId, controlId, notes);
    sendCreated(res, ev, 'Evidence uploaded');
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = evidenceFilterSchema.parse(req.query);
    const result = await listEvidence(filters);
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    sendSuccess(res, result.items, 'Evidence retrieved', 200, meta);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ev = await getEvidenceById(req.params.id as string);
    sendSuccess(res, ev, 'Evidence retrieved');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateEvidenceSchema.parse(req.body);
    const ev = await updateEvidence(req.params.id as string, input);
    sendSuccess(res, ev, 'Evidence updated');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteEvidence(req.params.id as string);
    sendSuccess(res, null, 'Evidence deleted');
  } catch (err) { next(err); }
}

export async function download(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ev = await getEvidenceById(req.params.id as string);
    const filePath = getEvidenceFilePath(ev);
    res.download(filePath, ev.fileName);
  } catch (err) { next(err); }
}
