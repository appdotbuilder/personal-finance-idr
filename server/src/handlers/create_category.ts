
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput, type Category } from '../schema';

export async function createCategory(input: CreateCategoryInput, userId: number): Promise<Category> {
  try {
    // Insert category record
    const result = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: input.name,
        type: input.type,
        color: input.color || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
}
