
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, and, gte, lte, desc, sum, count, sql } from 'drizzle-orm';

export async function getDashboardData(userId: number): Promise<DashboardData> {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Calculate current month date range
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Get current month summary - properly aggregate amounts
    const currentMonthTransactions = await db.select({
      type: transactionsTable.type,
      total_amount: sum(transactionsTable.amount),
      count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.user_id, userId),
      gte(transactionsTable.transaction_date, monthStart),
      lte(transactionsTable.transaction_date, monthEnd)
    ))
    .groupBy(transactionsTable.type)
    .execute();

    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionCount = 0;

    currentMonthTransactions.forEach(row => {
      const amount = parseFloat(row.total_amount || '0');
      if (row.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
      transactionCount += row.count;
    });

    const current_month_summary = {
      month: currentMonth,
      year: currentYear,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      remaining_balance: totalIncome - totalExpenses,
      transaction_count: transactionCount
    };

    // Get recent transactions (last 10)
    const recentTransactionsResult = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .orderBy(desc(transactionsTable.created_at))
      .limit(10)
      .execute();

    const recent_transactions = recentTransactionsResult.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));

    // Get categories summary for current month
    const categoriesSummaryResult = await db.select({
      category: categoriesTable,
      total_amount: sum(transactionsTable.amount),
      transaction_count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
    .where(and(
      eq(transactionsTable.user_id, userId),
      gte(transactionsTable.transaction_date, monthStart),
      lte(transactionsTable.transaction_date, monthEnd)
    ))
    .groupBy(categoriesTable.id, categoriesTable.user_id, categoriesTable.name, categoriesTable.type, categoriesTable.color, categoriesTable.created_at)
    .execute();

    const categories_summary = categoriesSummaryResult.map(row => ({
      category: row.category,
      total_amount: parseFloat(row.total_amount || '0'),
      transaction_count: row.transaction_count
    }));

    // Get monthly trend for last 6 months
    const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1);
    
    const monthlyTrendResult = await db.select({
      month: sql<number>`EXTRACT(MONTH FROM ${transactionsTable.transaction_date})::int`,
      year: sql<number>`EXTRACT(YEAR FROM ${transactionsTable.transaction_date})::int`,
      type: transactionsTable.type,
      total_amount: sum(transactionsTable.amount)
    })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.user_id, userId),
      gte(transactionsTable.transaction_date, sixMonthsAgo)
    ))
    .groupBy(
      sql`EXTRACT(MONTH FROM ${transactionsTable.transaction_date})`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.transaction_date})`,
      transactionsTable.type
    )
    .execute();

    // Process monthly trend data
    const monthlyTrendMap = new Map<string, { month: number; year: number; income: number; expenses: number }>();

    monthlyTrendResult.forEach(row => {
      const key = `${row.year}-${row.month}`;
      if (!monthlyTrendMap.has(key)) {
        monthlyTrendMap.set(key, {
          month: row.month,
          year: row.year,
          income: 0,
          expenses: 0
        });
      }
      
      const entry = monthlyTrendMap.get(key)!;
      const amount = parseFloat(row.total_amount || '0');
      
      if (row.type === 'income') {
        entry.income = amount;
      } else {
        entry.expenses = amount;
      }
    });

    const monthly_trend = Array.from(monthlyTrendMap.values())
      .sort((a, b) => a.year - b.year || a.month - b.month);

    return {
      current_month_summary,
      recent_transactions,
      categories_summary,
      monthly_trend
    };
  } catch (error) {
    console.error('Dashboard data retrieval failed:', error);
    throw error;
  }
}
