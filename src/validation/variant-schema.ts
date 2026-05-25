import { z } from 'zod';

export const variantSchema = z.object({
  name: z.string().min(1, 'Variant name must not be empty'),
  purpose: z.string().optional(),
  patch: z.record(z.string(), z.unknown()),
});

export const variantsSchema = z.array(variantSchema);
