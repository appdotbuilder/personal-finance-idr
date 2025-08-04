
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty dashboard data for user with no transactions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const result = await getDashboardData(userId);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    expect(result.current_month_summary.month).toEqual(currentMonth);
    expect(result.current_month_summary.year).toEqual(currentYear);
    expect(result.current_month_summary.total_income).toEqual(0);
    expect(result.current_month_summary.total_expenses).toEqual(0);
    expect(result.current_month_summary.remaining_balance).toEqual(0);
    expect(result.current_month_summary.transaction_count).toEqual(0);
    expect(result.recent_transactions).toEqual([]);
    expect(result.categories_summary).toEqual([]);
    expect(result.monthly_trend).toEqual([]);
  });

  it('should return comprehensive dashboard data with transactions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test categories
    const incomeCategory = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Salary',
        type: 'income',
        color: '#green'
      })
      .returning()
      .execute();

    const expenseCategory = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        type: 'expense',
        color: '#red'
      })
      .returning()
      .execute();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Create current month transactions first
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: incomeCategory[0].id,
          amount: '5000000.00', // 5M IDR income
          description: 'Monthly salary',
          transaction_date: new Date(currentYear, currentMonth - 1, 15),
          type: 'income'
        },
        {
          user_id: userId,
          category_id: expenseCategory[0].id,
          amount: '200000.50', // 200K IDR expense
          description: 'Lunch',
          transaction_date: new Date(currentYear, currentMonth - 1, 20),
          type: 'expense'
        }
      ])
      .execute();

    // Create the most recent transaction last (will be first in results due to order by created_at desc)
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: expenseCategory[0].id,
        amount: '150000.00', // 150K IDR expense
        description: 'Dinner',
        transaction_date: new Date(currentYear, currentMonth - 1, 21),
        type: 'expense'
      })
      .execute();

    // Create previous month transaction for trend (will be inserted after, so older created_at)
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: incomeCategory[0].id,
        amount: '4500000.00', // 4.5M IDR income in previous month
        description: 'Previous salary',
        transaction_date: new Date(prevYear, prevMonth - 1, 15),
        type: 'income'
      })
      .execute();

    const result = await getDashboardData(userId);

    // Test current month summary
    expect(result.current_month_summary.month).toEqual(currentMonth);
    expect(result.current_month_summary.year).toEqual(currentYear);
    expect(result.current_month_summary.total_income).toEqual(5000000);
    expect(result.current_month_summary.total_expenses).toEqual(350000.5);
    expect(result.current_month_summary.remaining_balance).toEqual(4649999.5);
    expect(result.current_month_summary.transaction_count).toEqual(3);

    // Test recent transactions (ordered by created_at desc)
    expect(result.recent_transactions).toHaveLength(4);
    // The last inserted transaction (previous month) should be first due to created_at ordering
    expect(result.recent_transactions[0].amount).toEqual(4500000);
    expect(result.recent_transactions[1].amount).toEqual(150000);
    expect(typeof result.recent_transactions[0].amount).toEqual('number');

    // Test categories summary
    expect(result.categories_summary).toHaveLength(2);
    
    const incomeSum = result.categories_summary.find(c => c.category.type === 'income');
    const expenseSum = result.categories_summary.find(c => c.category.type === 'expense');
    
    expect(incomeSum?.total_amount).toEqual(5000000);
    expect(incomeSum?.transaction_count).toEqual(1);
    expect(expenseSum?.total_amount).toEqual(350000.5);
    expect(expenseSum?.transaction_count).toEqual(2);

    // Test monthly trend
    expect(result.monthly_trend.length).toBeGreaterThan(0);
    const currentMonthTrend = result.monthly_trend.find(
      t => t.month === currentMonth && t.year === currentYear
    );
    expect(currentMonthTrend?.income).toEqual(5000000);
    expect(currentMonthTrend?.expenses).toEqual(350000.5);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create test user and data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        type: 'income'
      })
      .returning()
      .execute();

    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: categoryResult[0].id,
        amount: '1234567.89', // Precise decimal amount
        description: 'Test transaction',
        transaction_date: new Date(),
        type: 'income'
      })
      .execute();

    const result = await getDashboardData(userId);

    // Verify numeric types and precision
    expect(typeof result.current_month_summary.total_income).toEqual('number');
    expect(result.current_month_summary.total_income).toEqual(1234567.89);
    expect(typeof result.recent_transactions[0].amount).toEqual('number');
    expect(result.recent_transactions[0].amount).toEqual(1234567.89);
    expect(typeof result.categories_summary[0].total_amount).toEqual('number');
    expect(result.categories_summary[0].total_amount).toEqual(1234567.89);
  });
});
