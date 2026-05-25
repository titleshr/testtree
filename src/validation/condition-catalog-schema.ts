import { z } from 'zod';

export const conditionFieldSchema = z.object({
  fieldPath: z.string().min(1),
  sampleValue: z.unknown(),
  possibleValues: z.array(z.unknown()),
  sources: z.array(z.string()),
  isConditionField: z.boolean(),
  notes: z.string().optional(),
});

export const conditionCatalogSchema = z.object({
  domain: z.string().min(1),
  fields: z.array(conditionFieldSchema),
});
