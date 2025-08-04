
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type ExportReportInput } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function exportTransactions(input: ExportReportInput, userId: number): Promise<string> {
  try {
    // Build base query with joins
    const baseQuery = db.select({
      id: transactionsTable.id,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      transaction_date: transactionsTable.transaction_date,
      type: transactionsTable.type,
      category_name: categoriesTable.name,
      category_type: categoriesTable.type,
      created_at: transactionsTable.created_at
    })
    .from(transactionsTable)
    .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id));

    // Build conditions array
    const conditions = [
      eq(transactionsTable.user_id, userId),
      gte(transactionsTable.transaction_date, input.start_date),
      lte(transactionsTable.transaction_date, input.end_date)
    ];

    // Apply where conditions and ordering
    const results = await baseQuery
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.transaction_date))
      .execute();

    // Convert numeric amounts back to numbers
    const transactions = results.map(result => ({
      ...result,
      amount: parseFloat(result.amount)
    }));

    // Format based on requested format
    if (input.format === 'json') {
      return JSON.stringify(transactions, null, 2);
    } else {
      // Default to CSV format
      if (transactions.length === 0) {
        return 'ID,Amount,Description,Transaction Date,Type,Category Name,Category Type,Created At\n';
      }

      const headers = 'ID,Amount,Description,Transaction Date,Type,Category Name,Category Type,Created At\n';
      const rows = transactions.map(t => {
        const escapeCsv = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        return [
          t.id,
          t.amount,
          escapeCsv(t.description),
          t.transaction_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          t.type,
          escapeCsv(t.category_name),
          t.category_type,
          t.created_at.toISOString()
        ].join(',');
      }).join('\n');

      return headers + rows + '\n';
    }
  } catch (error) {
    console.error('Export transactions failed:', error);
    throw error;
  }
}
