
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User'
};

const testCategory = {
  name: 'Food & Dining',
  type: 'expense' as const,
  color: '#ff6b6b'
};

const testTransactionInput: CreateTransactionInput = {
  category_id: 1,
  amount: 150000,
  description: 'Lunch at restaurant',
  transaction_date: new Date('2024-01-15T12:00:00Z'),
  type: 'expense'
};

let testUserId: number;
let testCategoryId: number;

describe('createTransaction', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        ...testCategory,
        user_id: testUserId
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Update test input with actual category ID
    testTransactionInput.category_id = testCategoryId;
  });

  afterEach(resetDB);

  it('should create a transaction', async () => {
    const result = await createTransaction(testTransactionInput, testUserId);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.amount).toEqual(150000);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Lunch at restaurant');
    expect(result.transaction_date).toEqual(testTransactionInput.transaction_date);
    expect(result.type).toEqual('expense');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    const result = await createTransaction(testTransactionInput, testUserId);

    // Query using proper drizzle syntax
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(testUserId);
    expect(transactions[0].category_id).toEqual(testCategoryId);
    expect(parseFloat(transactions[0].amount)).toEqual(150000);
    expect(transactions[0].description).toEqual('Lunch at restaurant');
    expect(transactions[0].type).toEqual('expense');
    expect(transactions[0].created_at).toBeInstanceOf(Date);
    expect(transactions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle income transactions', async () => {
    const incomeInput: CreateTransactionInput = {
      category_id: testCategoryId,
      amount: 5000000,
      description: 'Monthly salary',
      transaction_date: new Date('2024-01-01T09:00:00Z'),
      type: 'income'
    };

    const result = await createTransaction(incomeInput, testUserId);

    expect(result.type).toEqual('income');
    expect(result.amount).toEqual(5000000);
    expect(result.description).toEqual('Monthly salary');
  });

  it('should throw error when category does not exist', async () => {
    const invalidInput: CreateTransactionInput = {
      ...testTransactionInput,
      category_id: 99999
    };

    await expect(createTransaction(invalidInput, testUserId))
      .rejects.toThrow(/category with id 99999 not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'other_hash',
        full_name: 'Other User'
      })
      .returning()
      .execute();
    
    const otherUserId = otherUserResult[0].id;

    // Try to use testCategory (belongs to testUserId) with otherUserId
    await expect(createTransaction(testTransactionInput, otherUserId))
      .rejects.toThrow(/category does not belong to the user/i);
  });

  it('should handle decimal amounts correctly', async () => {
    const decimalInput: CreateTransactionInput = {
      category_id: testCategoryId,
      amount: 123.45,
      description: 'Small purchase',
      transaction_date: new Date('2024-01-15T14:30:00Z'),
      type: 'expense'
    };

    const result = await createTransaction(decimalInput, testUserId);

    expect(result.amount).toEqual(123.45);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const dbTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(dbTransaction[0].amount)).toEqual(123.45);
  });
});
