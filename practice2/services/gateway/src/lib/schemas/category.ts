import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Enter a category name').trim(),
  icon: z.string().nullable().optional().default(null),
  color: z.string().min(1, 'Select a color')
});

export type CategoryFormData = z.infer<typeof categorySchema>;
