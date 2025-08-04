
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionsInput, type Transaction } from '../schema';
import { eq, and, gte, lte, desc, type SQL } from 'drizzle-orm';

export async function getTransactions(input: GetTransactionsInput, userId: number): Promise<Transaction[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(transactionsTable.user_id, userId)
    ];

    // Add optional filters
    if (input.start_date) {
      conditions.push(gte(transactionsTable.transaction_date, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(transactionsTable.transaction_date, input.end_date));
    }

    if (input.category_id) {
      conditions.push(eq(transactionsTable.category_id, input.category_id));
    }

    if (input.type) {
      conditions.push(eq(transactionsTable.type, input.type));
    }

    // Build base query with filters and ordering
    const baseQuery = db.select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.transaction_date));

    // Apply pagination in one final chain
    const finalQuery = input.limit && input.offset
      ? baseQuery.limit(input.limit).offset(input.offset)
      : input.limit
      ? baseQuery.limit(input.limit)
      : input.offset
      ? baseQuery.offset(input.offset)
      : baseQuery;

    const results = await finalQuery.execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
}
