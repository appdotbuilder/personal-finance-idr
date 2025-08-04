
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerInputSchema,
  loginInputSchema,
  createCategoryInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  getTransactionsInputSchema,
  exportReportInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { getMonthlySummary } from './handlers/get_monthly_summary';
import { getDashboardData } from './handlers/get_dashboard_data';
import { exportTransactions } from './handlers/export_transactions';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Mock authentication middleware - in real implementation, this would validate JWT tokens
const authenticatedProcedure = publicProcedure.use(async ({ next }) => {
  // Placeholder: Extract userId from JWT token in Authorization header
  const userId = 1; // Mock user ID
  return next({
    ctx: { userId }
  });
});

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Category management routes
  createCategory: authenticatedProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input, ctx }) => createCategory(input, ctx.userId)),

  getCategories: authenticatedProcedure
    .query(({ ctx }) => getCategories(ctx.userId)),

  // Transaction management routes
  createTransaction: authenticatedProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input, ctx }) => createTransaction(input, ctx.userId)),

  getTransactions: authenticatedProcedure
    .input(getTransactionsInputSchema)
    .query(({ input, ctx }) => getTransactions(input, ctx.userId)),

  updateTransaction: authenticatedProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input, ctx }) => updateTransaction(input, ctx.userId)),

  deleteTransaction: authenticatedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => deleteTransaction(input.id, ctx.userId)),

  // Financial summary routes
  getMonthlySummary: authenticatedProcedure
    .input(z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int()
    }))
    .query(({ input, ctx }) => getMonthlySummary(input.month, input.year, ctx.userId)),

  getDashboardData: authenticatedProcedure
    .query(({ ctx }) => getDashboardData(ctx.userId)),

  // Export routes
  exportTransactions: authenticatedProcedure
    .input(exportReportInputSchema)
    .query(({ input, ctx }) => exportTransactions(input, ctx.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Finance Management TRPC server listening at port: ${port}`);
}

start();
