import { z } from 'zod';
import { RiskCategory, RiskStatus } from '@prisma/client';

export const createRiskSchema = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  category:    z.nativeEnum(RiskCategory).default('TECHNICAL'),
  likelihood:  z.number().int().min(1).max(5),
  impact:      z.number().int().min(1).max(5),
  status:      z.nativeEnum(RiskStatus).default('OPEN'),
  ownerId:     z.string().uuid().optional(),
  dueDate:     z.string().datetime().optional(),
});

export const updateRiskSchema = createRiskSchema.partial();

export const riskFilterSchema = z.object({
  status:     z.nativeEnum(RiskStatus).optional(),
  category:   z.nativeEnum(RiskCategory).optional(),
  likelihood: z.coerce.number().int().min(1).max(5).optional(),
  impact:     z.coerce.number().int().min(1).max(5).optional(),
  search:     z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRiskInput = z.infer<typeof createRiskSchema>;
export type UpdateRiskInput = z.infer<typeof updateRiskSchema>;
export type RiskFilterInput = z.infer<typeof riskFilterSchema>;
