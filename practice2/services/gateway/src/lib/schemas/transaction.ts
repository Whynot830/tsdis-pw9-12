import { z } from 'zod';

export const transactionSchema = z.object({
  amount: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    return Number.isNaN(n) ? undefined : n;
  }, z.number().positive('Enter a valid amount')),
  categoryId: z
    .union([z.number().int().positive(), z.null()])
    .refine((v) => v !== null, { message: 'Select a category' }),
  description: z.string().optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
