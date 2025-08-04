
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateTransaction(input: UpdateTransactionInput, userId: number): Promise<Transaction> {
  try {
    // First, verify the transaction exists and belongs to the user
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.id, input.id),
        eq(transactionsTable.user_id, userId)
      ))
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error('Transaction not found or access denied');
    }

    // If category_id is being updated, verify it exists and belongs to the user
    if (input.category_id !== undefined) {
      const category = await db.select()
        .from(categoriesTable)
        .where(and(
          eq(categoriesTable.id, input.category_id),
          eq(categoriesTable.user_id, userId)
        ))
        .execute();

      if (category.length === 0) {
        throw new Error('Category not found or access denied');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.transaction_date !== undefined) {
      updateData.transaction_date = input.transaction_date;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updateData)
      .where(and(
        eq(transactionsTable.id, input.id),
        eq(transactionsTable.user_id, userId)
      ))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
}
