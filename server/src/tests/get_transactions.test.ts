
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type GetTransactionsInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  let testUserId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test transactions
    const baseDate = new Date('2024-01-15');
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: testCategoryId,
          amount: '100.50',
          description: 'First transaction',
          transaction_date: new Date('2024-01-10'),
          type: 'expense'
        },
        {
          user_id: testUserId,
          category_id: testCategoryId,
          amount: '200.75',
          description: 'Second transaction',
          transaction_date: new Date('2024-01-20'),
          type: 'income'
        },
        {
          user_id: testUserId,
          category_id: testCategoryId,
          amount: '50.25',
          description: 'Third transaction',
          transaction_date: baseDate,
          type: 'expense'
        }
      ])
      .execute();
  });

  afterEach(resetDB);

  it('should return all transactions for user without filters', async () => {
    const input: GetTransactionsInput = {};
    const result = await getTransactions(input, testUserId);

    expect(result).toHaveLength(3);
    // Should be ordered by transaction_date descending
    expect(result[0].transaction_date.getTime()).toEqual(new Date('2024-01-20').getTime());
    expect(result[1].transaction_date.getTime()).toEqual(new Date('2024-01-15').getTime());
    expect(result[2].transaction_date.getTime()).toEqual(new Date('2024-01-10').getTime());
    
    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toEqual(200.75);
  });

  it('should filter by date range', async () => {
    const input: GetTransactionsInput = {
      start_date: new Date('2024-01-12'),
      end_date: new Date('2024-01-18')
    };
    const result = await getTransactions(input, testUserId);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('Third transaction');
    expect(result[0].amount).toEqual(50.25);
  });

  it('should filter by category', async () => {
    // Create another category for filtering test
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Other Category',
        type: 'income'
      })
      .returning()
      .execute();
    const otherCategoryId = categoryResult[0].id;

    // Add transaction with different category
    await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        category_id: otherCategoryId,
        amount: '300.00',
        description: 'Other category transaction',
        transaction_date: new Date('2024-01-25'),
        type: 'income'
      })
      .execute();

    const input: GetTransactionsInput = {
      category_id: testCategoryId
    };
    const result = await getTransactions(input, testUserId);

    expect(result).toHaveLength(3);
    result.forEach(transaction => {
      expect(transaction.category_id).toEqual(testCategoryId);
    });
  });

  it('should filter by transaction type', async () => {
    const input: GetTransactionsInput = {
      type: 'expense'
    };
    const result = await getTransactions(input, testUserId);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.type).toEqual('expense');
    });
  });

  it('should apply pagination with limit and offset', async () => {
    const input: GetTransactionsInput = {
      limit: 2,
      offset: 1
    };
    const result = await getTransactions(input, testUserId);

    expect(result).toHaveLength(2);
    // Should skip the first (most recent) transaction
    expect(result[0].transaction_date.getTime()).toEqual(new Date('2024-01-15').getTime());
    expect(result[1].transaction_date.getTime()).toEqual(new Date('2024-01-10').getTime());
  });

  it('should combine multiple filters', async () => {
    const input: GetTransactionsInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-16'),
      type: 'expense',
      limit: 1
    };
    const result = await getTransactions(input, testUserId);

    expect(result).toHaveLength(1);
    expect(result[0].type).toEqual('expense');
    expect(result[0].transaction_date <= new Date('2024-01-16')).toBe(true);
    expect(result[0].transaction_date >= new Date('2024-01-01')).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetTransactionsInput = {};
    const result = await getTransactions(input, 99999);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no transactions match filters', async () => {
    const input: GetTransactionsInput = {
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-28')
    };
    const result = await getTransactions(input, testUserId);

    expect(result).toHaveLength(0);
  });
});
