
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTransaction(transactionId: number, userId: number): Promise<void> {
  try {
    // First check if transaction exists and belongs to the user
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, transactionId),
          eq(transactionsTable.user_id, userId)
        )
      )
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error('Transaction not found or does not belong to user');
    }

    // Delete the transaction
    await db.delete(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, transactionId),
          eq(transactionsTable.user_id, userId)
        )
      )
      .execute();
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
}
