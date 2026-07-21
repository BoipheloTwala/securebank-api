import { z } from 'zod';
import { ControlFramework, ControlStatus } from '@prisma/client';

export const createControlSchema = z.object({
  title:         z.string().min(3).max(200),
  description:   z.string().max(2000).optional(),
  framework:     z.nativeEnum(ControlFramework).default('ISO27001'),
  controlRef:    z.string().min(1).max(50),
  status:        z.nativeEnum(ControlStatus).default('NOT_STARTED'),
  effectiveness: z.number().int().min(0).max(100).default(0),
  riskIds:       z.array(z.string().uuid()).optional(),
});

export const updateControlSchema = createControlSchema.partial();

export const controlFilterSchema = z.object({
  framework: z.nativeEnum(ControlFramework).optional(),
  status:    z.nativeEnum(ControlStatus).optional(),
  search:    z.string().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

export const linkRiskSchema = z.object({
  riskId: z.string().uuid(),
});

export type CreateControlInput = z.infer<typeof createControlSchema>;
export type UpdateControlInput = z.infer<typeof updateControlSchema>;
export type ControlFilterInput = z.infer<typeof controlFilterSchema>;
