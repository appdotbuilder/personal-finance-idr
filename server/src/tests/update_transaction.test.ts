
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User'
};

const testCategory = {
  name: 'Test Category',
  type: 'expense' as const,
  color: '#FF0000'
};

const testTransaction = {
  amount: '100.50',
  description: 'Original transaction',
  transaction_date: new Date('2024-01-01'),
  type: 'expense' as const
};

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a transaction with all fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ ...testCategory, user_id: userId })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        user_id: userId,
        category_id: categoryId
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Create new category for update
    const newCategoryResult = await db.insert(categoriesTable)
      .values({
        name: 'New Category',
        type: 'income' as const,
        color: '#00FF00',
        user_id: userId
      })
      .returning()
      .execute();
    const newCategoryId = newCategoryResult[0].id;

    // Update transaction
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      category_id: newCategoryId,
      amount: 250.75,
      description: 'Updated transaction',
      transaction_date: new Date('2024-02-01'),
      type: 'income'
    };

    const result = await updateTransaction(updateInput, userId);

    // Verify all fields are updated
    expect(result.id).toEqual(transactionId);
    expect(result.user_id).toEqual(userId);
    expect(result.category_id).toEqual(newCategoryId);
    expect(result.amount).toEqual(250.75);
    expect(result.description).toEqual('Updated transaction');
    expect(result.transaction_date).toEqual(new Date('2024-02-01'));
    expect(result.type).toEqual('income');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.amount).toBe('number');
  });

  it('should update only specified fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ ...testCategory, user_id: userId })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        user_id: userId,
        category_id: categoryId
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Update only amount and description
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 150.25,
      description: 'Partially updated transaction'
    };

    const result = await updateTransaction(updateInput, userId);

    // Verify only specified fields are updated
    expect(result.amount).toEqual(150.25);
    expect(result.description).toEqual('Partially updated transaction');
    expect(result.category_id).toEqual(categoryId); // Should remain unchanged
    expect(result.type).toEqual('expense'); // Should remain unchanged
    expect(result.transaction_date).toEqual(new Date('2024-01-01')); // Should remain unchanged
  });

  it('should save changes to database', async () => {
    // Create test data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values({ ...testCategory, user_id: userId })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        user_id: userId,
        category_id: categoryId
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Update transaction
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 300.00,
      description: 'Database test update'
    };

    await updateTransaction(updateInput, userId);

    // Verify changes are saved in database
    const savedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(savedTransaction).toHaveLength(1);
    expect(parseFloat(savedTransaction[0].amount)).toEqual(300.00);
    expect(savedTransaction[0].description).toEqual('Database test update');
    expect(savedTransaction[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when transaction not found', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const updateInput: UpdateTransactionInput = {
      id: 999, // Non-existent transaction ID
      amount: 100.00
    };

    await expect(updateTransaction(updateInput, userId))
      .rejects.toThrow(/transaction not found or access denied/i);
  });

  it('should throw error when transaction belongs to different user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'other_hash',
        full_name: 'Other User'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create category and transaction for user1
    const categoryResult = await db.insert(categoriesTable)
      .values({ ...testCategory, user_id: user1Id })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        user_id: user1Id,
        category_id: categoryId
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Try to update user1's transaction as user2
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 200.00
    };

    await expect(updateTransaction(updateInput, user2Id))
      .rejects.toThrow(/transaction not found or access denied/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'other_hash',
        full_name: 'Other User'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create categories for both users
    const user1CategoryResult = await db.insert(categoriesTable)
      .values({ ...testCategory, user_id: user1Id })
      .returning()
      .execute();
    const user1CategoryId = user1CategoryResult[0].id;

    const user2CategoryResult = await db.insert(categoriesTable)
      .values({ ...testCategory, name: 'User2 Category', user_id: user2Id })
      .returning()
      .execute();
    const user2CategoryId = user2CategoryResult[0].id;

    // Create transaction for user1
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        user_id: user1Id,
        category_id: user1CategoryId
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Try to update with user2's category
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      category_id: user2CategoryId
    };

    await expect(updateTransaction(updateInput, user1Id))
      .rejects.toThrow(/category not found or access denied/i);
  });

  it('should throw error when category does not exist', async () => {
    // Create test user and transaction
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values({ ...testCategory, user_id: userId })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        user_id: userId,
        category_id: categoryId
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Try to update with non-existent category
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      category_id: 999 // Non-existent category ID
    };

    await expect(updateTransaction(updateInput, userId))
      .rejects.toThrow(/category not found or access denied/i);
  });
});
