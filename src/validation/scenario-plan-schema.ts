import { z } from 'zod';

export const scenarioSchema = z.object({
  name: z.string().min(1),
  purpose: z.string(),
  coveredConditions: z.array(z.string()),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export const scenarioPlanSchema = z.object({
  domain: z.string().min(1),
  strategy: z.string(),
  scenarios: z.array(scenarioSchema),
});
