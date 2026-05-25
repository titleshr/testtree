import { z } from 'zod';

export const testtreeConfigSchema = z.object({
  project: z.string().optional(),
  outputDir: z.string().optional(),
  domain: z.string().optional(),
  base: z.string().optional(),
  variants: z.string().optional(),
  fixtures: z.string().optional(),
});
