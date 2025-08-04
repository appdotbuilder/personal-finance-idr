
import { z } from 'zod';

// User authentication schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Transaction category schemas
export const categorySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  type: z.enum(['income', 'expense']),
  color: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  color: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Transaction schemas
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  category_id: z.number(),
  amount: z.number(), // Amount in IDR
  description: z.string(),
  transaction_date: z.coerce.date(),
  type: z.enum(['income', 'expense']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  category_id: z.number(),
  amount: z.number().positive(),
  description: z.string().min(1),
  transaction_date: z.coerce.date(),
  type: z.enum(['income', 'expense'])
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.number(),
  category_id: z.number().optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  transaction_date: z.coerce.date().optional(),
  type: z.enum(['income', 'expense']).optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Financial summary schemas
export const monthlySummarySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  total_income: z.number(),
  total_expenses: z.number(),
  remaining_balance: z.number(),
  transaction_count: z.number().int()
});

export type MonthlySummary = z.infer<typeof monthlySummarySchema>;

export const getTransactionsInputSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  category_id: z.number().optional(),
  type: z.enum(['income', 'expense']).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  current_month_summary: monthlySummarySchema,
  recent_transactions: z.array(transactionSchema),
  categories_summary: z.array(z.object({
    category: categorySchema,
    total_amount: z.number(),
    transaction_count: z.number().int()
  })),
  monthly_trend: z.array(z.object({
    month: z.number().int(),
    year: z.number().int(),
    income: z.number(),
    expenses: z.number()
  }))
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Export report schema
export const exportReportInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  format: z.enum(['csv', 'json']).optional().default('csv')
});

export type ExportReportInput = z.infer<typeof exportReportInputSchema>;
