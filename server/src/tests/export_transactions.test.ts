
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type ExportReportInput } from '../schema';
import { exportTransactions } from '../handlers/export_transactions';

describe('exportTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;

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

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Food',
        type: 'expense',
        color: '#FF0000'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });

  it('should export transactions in CSV format by default', async () => {
    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        category_id: testCategoryId,
        amount: '25.50',
        description: 'Lunch at restaurant',
        transaction_date: new Date('2024-01-15'),
        type: 'expense'
      })
      .execute();

    const input: ExportReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      format: 'csv'
    };

    const result = await exportTransactions(input, testUserId);

    // Check CSV headers
    expect(result).toContain('ID,Amount,Description,Transaction Date,Type,Category Name,Category Type,Created At');
    
    // Check CSV data
    expect(result).toContain('25.5');
    expect(result).toContain('Lunch at restaurant');
    expect(result).toContain('2024-01-15');
    expect(result).toContain('expense');
    expect(result).toContain('Food');
  });

  it('should export transactions in JSON format when specified', async () => {
    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        category_id: testCategoryId,
        amount: '100.00',
        description: 'Grocery shopping',
        transaction_date: new Date('2024-01-10'),
        type: 'expense'
      })
      .execute();

    const input: ExportReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      format: 'json'
    };

    const result = await exportTransactions(input, testUserId);

    // Parse JSON to verify structure
    const jsonData = JSON.parse(result);
    expect(Array.isArray(jsonData)).toBe(true);
    expect(jsonData).toHaveLength(1);

    const transaction = jsonData[0];
    expect(transaction.amount).toBe(100);
    expect(transaction.description).toBe('Grocery shopping');
    expect(transaction.type).toBe('expense');
    expect(transaction.category_name).toBe('Food');
    expect(transaction.category_type).toBe('expense');
  });

  it('should filter transactions by date range', async () => {
    // Create transactions in different months
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: testCategoryId,
          amount: '50.00',
          description: 'January transaction',
          transaction_date: new Date('2024-01-15'),
          type: 'expense'
        },
        {
          user_id: testUserId,
          category_id: testCategoryId,
          amount: '75.00',
          description: 'February transaction',
          transaction_date: new Date('2024-02-15'),
          type: 'expense'
        }
      ])
      .execute();

    const input: ExportReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      format: 'json'
    };

    const result = await exportTransactions(input, testUserId);
    const jsonData = JSON.parse(result);

    expect(jsonData).toHaveLength(1);
    expect(jsonData[0].description).toBe('January transaction');
  });

  it('should only return transactions for the specified user', async () => {
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
        name: 'Transport',
        type: 'expense'
      })
      .returning()
      .execute();
    const otherCategoryId = otherCategoryResult[0].id;

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          category_id: testCategoryId,
          amount: '30.00',
          description: 'My transaction',
          transaction_date: new Date('2024-01-15'),
          type: 'expense'
        },
        {
          user_id: otherUserId,
          category_id: otherCategoryId,
          amount: '20.00',
          description: 'Other user transaction',
          transaction_date: new Date('2024-01-15'),
          type: 'expense'
        }
      ])
      .execute();

    const input: ExportReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      format: 'json'
    };

    const result = await exportTransactions(input, testUserId);
    const jsonData = JSON.parse(result);

    expect(jsonData).toHaveLength(1);
    expect(jsonData[0].description).toBe('My transaction');
  });

  it('should return empty CSV with headers when no transactions found', async () => {
    const input: ExportReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      format: 'csv'
    };

    const result = await exportTransactions(input, testUserId);

    expect(result).toBe('ID,Amount,Description,Transaction Date,Type,Category Name,Category Type,Created At\n');
  });

  it('should return empty JSON array when no transactions found', async () => {
    const input: ExportReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      format: 'json'
    };

    const result = await exportTransactions(input, testUserId);

    expect(result).toBe('[]');
  });

  it('should handle CSV escaping for special characters', async () => {
    // Create transaction with special characters
    await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        category_id: testCategoryId,
        amount: '15.00',
        description: 'Lunch at "Joe\'s Place", very good!',
        transaction_date: new Date('2024-01-15'),
        type: 'expense'
      })
      .execute();

    const input: ExportReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      format: 'csv'
    };

    const result = await exportTransactions(input, testUserId);

    // Check that quotes are properly escaped in CSV
    expect(result).toContain('"Lunch at ""Joe\'s Place"", very good!"');
  });
});
