
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { getMonthlySummary } from '../handlers/get_monthly_summary';

describe('getMonthlySummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let incomeCategoryId: number;
  let expenseCategoryId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test categories
    const incomeCategory = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Salary',
        type: 'income'
      })
      .returning()
      .execute();
    incomeCategoryId = incomeCategory[0].id;

    const expenseCategory = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Food',
        type: 'expense'
      })
      .returning()
      .execute();
    expenseCategoryId = expenseCategory[0].id;
  });

  it('should return zero summary for month with no transactions', async () => {
    const result = await getMonthlySummary(12, 2024, testUserId);

    expect(result.month).toEqual(12);
    expect(result.year).toEqual(2024);
    expect(result.total_income).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.remaining_balance).toEqual(0);
    expect(result.transaction_count).toEqual(0);
  });

  it('should calculate summary for month with income only', async () => {
    // Create income transactions in December 2024
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: incomeCategoryId,
          amount: '5000000.00', // 5M IDR
          description: 'Salary Payment',
          transaction_date: new Date(2024, 11, 15), // December 15, 2024
          type: 'income'
        },
        {
          user_id: testUserId,
          category_id: incomeCategoryId,
          amount: '1000000.00', // 1M IDR
          description: 'Bonus',
          transaction_date: new Date(2024, 11, 20), // December 20, 2024
          type: 'income'
        }
      ])
      .execute();

    const result = await getMonthlySummary(12, 2024, testUserId);

    expect(result.month).toEqual(12);
    expect(result.year).toEqual(2024);
    expect(result.total_income).toEqual(6000000);
    expect(result.total_expenses).toEqual(0);
    expect(result.remaining_balance).toEqual(6000000);
    expect(result.transaction_count).toEqual(2);
  });

  it('should calculate summary for month with expenses only', async () => {
    // Create expense transactions in December 2024
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: expenseCategoryId,
          amount: '500000.00', // 500K IDR
          description: 'Groceries',
          transaction_date: new Date(2024, 11, 10), // December 10, 2024
          type: 'expense'
        },
        {
          user_id: testUserId,
          category_id: expenseCategoryId,
          amount: '300000.00', // 300K IDR
          description: 'Restaurant',
          transaction_date: new Date(2024, 11, 25), // December 25, 2024
          type: 'expense'
        }
      ])
      .execute();

    const result = await getMonthlySummary(12, 2024, testUserId);

    expect(result.month).toEqual(12);
    expect(result.year).toEqual(2024);
    expect(result.total_income).toEqual(0);
    expect(result.total_expenses).toEqual(800000);
    expect(result.remaining_balance).toEqual(-800000);
    expect(result.transaction_count).toEqual(2);
  });

  it('should calculate complete summary with both income and expenses', async () => {
    // Create mixed transactions in December 2024
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: incomeCategoryId,
          amount: '5000000.00', // 5M IDR income
          description: 'Salary',
          transaction_date: new Date(2024, 11, 1), // December 1, 2024
          type: 'income'
        },
        {
          user_id: testUserId,
          category_id: expenseCategoryId,
          amount: '1500000.00', // 1.5M IDR expense
          description: 'Rent',
          transaction_date: new Date(2024, 11, 5), // December 5, 2024
          type: 'expense'
        },
        {
          user_id: testUserId,
          category_id: expenseCategoryId,
          amount: '800000.00', // 800K IDR expense
          description: 'Utilities',
          transaction_date: new Date(2024, 11, 31), // December 31, 2024
          type: 'expense'
        }
      ])
      .execute();

    const result = await getMonthlySummary(12, 2024, testUserId);

    expect(result.month).toEqual(12);
    expect(result.year).toEqual(2024);
    expect(result.total_income).toEqual(5000000);
    expect(result.total_expenses).toEqual(2300000);
    expect(result.remaining_balance).toEqual(2700000);
    expect(result.transaction_count).toEqual(3);
  });

  it('should only include transactions from specified month and year', async () => {
    // Create transactions in different months
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: incomeCategoryId,
          amount: '1000000.00',
          description: 'November Income',
          transaction_date: new Date(2024, 10, 15), // November 2024
          type: 'income'
        },
        {
          user_id: testUserId,
          category_id: incomeCategoryId,
          amount: '2000000.00',
          description: 'December Income',
          transaction_date: new Date(2024, 11, 15), // December 2024
          type: 'income'
        },
        {
          user_id: testUserId,
          category_id: incomeCategoryId,
          amount: '3000000.00',
          description: 'January Income',
          transaction_date: new Date(2025, 0, 15), // January 2025
          type: 'income'
        }
      ])
      .execute();

    const result = await getMonthlySummary(12, 2024, testUserId);

    // Should only include December 2024 transaction
    expect(result.total_income).toEqual(2000000);
    expect(result.transaction_count).toEqual(1);
  });

  it('should only include transactions for specified user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Other User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    // Create category for other user
    const otherCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: otherUserId,
        name: 'Other Income',
        type: 'income'
      })
      .returning()
      .execute();
    const otherCategoryId = otherCategoryResult[0].id;

    // Create transactions for both users in December 2024
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: incomeCategoryId,
          amount: '1000000.00',
          description: 'Test User Income',
          transaction_date: new Date(2024, 11, 15),
          type: 'income'
        },
        {
          user_id: otherUserId,
          category_id: otherCategoryId,
          amount: '2000000.00',
          description: 'Other User Income',
          transaction_date: new Date(2024, 11, 15),
          type: 'income'
        }
      ])
      .execute();

    const result = await getMonthlySummary(12, 2024, testUserId);

    // Should only include test user's transaction
    expect(result.total_income).toEqual(1000000);
    expect(result.transaction_count).toEqual(1);
  });
});
