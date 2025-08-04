
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a transaction belonging to the user', async () => {
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

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        type: 'expense',
        color: '#FF0000'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '100.50',
        description: 'Test transaction',
        transaction_date: new Date(),
        type: 'expense'
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Delete the transaction
    await deleteTransaction(transactionId, userId);

    // Verify transaction was deleted
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should throw error when transaction does not exist', async () => {
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

    const nonExistentTransactionId = 99999;

    await expect(deleteTransaction(nonExistentTransactionId, userId))
      .rejects.toThrow(/transaction not found/i);
  });

  it('should throw error when transaction belongs to different user', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        full_name: 'User One'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        full_name: 'User Two'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create category for user1
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: user1Id,
        name: 'Test Category',
        type: 'expense',
        color: '#FF0000'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create transaction for user1
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: user1Id,
        category_id: categoryId,
        amount: '100.50',
        description: 'Test transaction',
        transaction_date: new Date(),
        type: 'expense'
      })
      .returning()
      .execute();
    const transactionId = transactionResult[0].id;

    // Try to delete with user2's ID
    await expect(deleteTransaction(transactionId, user2Id))
      .rejects.toThrow(/transaction not found/i);

    // Verify transaction still exists
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
  });

  it('should not affect other transactions when deleting one', async () => {
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

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        type: 'expense',
        color: '#FF0000'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create first transaction
    const transaction1Result = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '100.50',
        description: 'Transaction 1',
        transaction_date: new Date(),
        type: 'expense'
      })
      .returning()
      .execute();
    const transaction1Id = transaction1Result[0].id;

    // Create second transaction
    const transaction2Result = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '200.75',
        description: 'Transaction 2',
        transaction_date: new Date(),
        type: 'expense'
      })
      .returning()
      .execute();
    const transaction2Id = transaction2Result[0].id;

    // Delete first transaction
    await deleteTransaction(transaction1Id, userId);

    // Verify first transaction was deleted
    const deletedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction1Id))
      .execute();
    expect(deletedTransactions).toHaveLength(0);

    // Verify second transaction still exists
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction2Id))
      .execute();
    expect(remainingTransactions).toHaveLength(1);
    expect(remainingTransactions[0].description).toEqual('Transaction 2');
  });
});
