
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput, userId: number): Promise<Transaction> {
  try {
    // Verify category exists and belongs to the user
    const categoryExists = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();

    if (categoryExists.length === 0) {
      throw new Error(`Category with id ${input.category_id} not found`);
    }

    if (categoryExists[0].user_id !== userId) {
      throw new Error('Category does not belong to the user');
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: input.category_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        transaction_date: input.transaction_date,
        type: input.type
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}
