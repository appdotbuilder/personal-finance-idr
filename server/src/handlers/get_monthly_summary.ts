
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type MonthlySummary } from '../schema';
import { eq, and, gte, lt, sum, count } from 'drizzle-orm';

export async function getMonthlySummary(month: number, year: number, userId: number): Promise<MonthlySummary> {
  try {
    // Calculate date range for the specified month
    const startDate = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
    const endDate = new Date(year, month, 1); // First day of next month

    // Query for income transactions
    const incomeResult = await db
      .select({
        total: sum(transactionsTable.amount),
        count: count()
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.user_id, userId),
          eq(transactionsTable.type, 'income'),
          gte(transactionsTable.transaction_date, startDate),
          lt(transactionsTable.transaction_date, endDate)
        )
      )
      .execute();

    // Query for expense transactions
    const expenseResult = await db
      .select({
        total: sum(transactionsTable.amount),
        count: count()
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.user_id, userId),
          eq(transactionsTable.type, 'expense'),
          gte(transactionsTable.transaction_date, startDate),
          lt(transactionsTable.transaction_date, endDate)
        )
      )
      .execute();

    // Extract values with null handling
    const totalIncome = incomeResult[0]?.total ? parseFloat(incomeResult[0].total) : 0;
    const incomeCount = incomeResult[0]?.count || 0;
    const totalExpenses = expenseResult[0]?.total ? parseFloat(expenseResult[0].total) : 0;
    const expenseCount = expenseResult[0]?.count || 0;

    // Calculate remaining balance and total transaction count
    const remainingBalance = totalIncome - totalExpenses;
    const transactionCount = incomeCount + expenseCount;

    return {
      month,
      year,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      remaining_balance: remainingBalance,
      transaction_count: transactionCount
    };
  } catch (error) {
    console.error('Monthly summary calculation failed:', error);
    throw error;
  }
}
