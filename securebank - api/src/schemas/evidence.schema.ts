import { z } from 'zod';
import { EvidenceStatus } from '@prisma/client';

export const updateEvidenceSchema = z.object({
  title:     z.string().min(3).max(200).optional(),
  status:    z.nativeEnum(EvidenceStatus).optional(),
  notes:     z.string().max(2000).optional(),
  controlId: z.string().uuid().nullable().optional(),
});

export const evidenceFilterSchema = z.object({
  status:    z.nativeEnum(EvidenceStatus).optional(),
  controlId: z.string().uuid().optional(),
  search:    z.string().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;
export type EvidenceFilterInput = z.infer<typeof evidenceFilterSchema>;
