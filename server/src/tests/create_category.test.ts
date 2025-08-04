
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

describe('createCategory', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create an income category', async () => {
    const input: CreateCategoryInput = {
      name: 'Salary',
      type: 'income',
      color: '#4CAF50'
    };

    const result = await createCategory(input, testUserId);

    expect(result.name).toBe('Salary');
    expect(result.type).toBe('income');
    expect(result.color).toBe('#4CAF50');
    expect(result.user_id).toBe(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an expense category', async () => {
    const input: CreateCategoryInput = {
      name: 'Food',
      type: 'expense',
      color: '#F44336'
    };

    const result = await createCategory(input, testUserId);

    expect(result.name).toBe('Food');
    expect(result.type).toBe('expense');
    expect(result.color).toBe('#F44336');
    expect(result.user_id).toBe(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create category without color', async () => {
    const input: CreateCategoryInput = {
      name: 'Utilities',
      type: 'expense'
    };

    const result = await createCategory(input, testUserId);

    expect(result.name).toBe('Utilities');
    expect(result.type).toBe('expense');
    expect(result.color).toBeNull();
    expect(result.user_id).toBe(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const input: CreateCategoryInput = {
      name: 'Investment',
      type: 'income',
      color: '#2196F3'
    };

    const result = await createCategory(input, testUserId);

    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Investment');
    expect(categories[0].type).toBe('income');
    expect(categories[0].color).toBe('#2196F3');
    expect(categories[0].user_id).toBe(testUserId);
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple categories for same user', async () => {
    const input1: CreateCategoryInput = {
      name: 'Freelance',
      type: 'income'
    };

    const input2: CreateCategoryInput = {
      name: 'Groceries',
      type: 'expense'
    };

    const result1 = await createCategory(input1, testUserId);
    const result2 = await createCategory(input2, testUserId);

    expect(result1.id).not.toBe(result2.id);
    expect(result1.user_id).toBe(testUserId);
    expect(result2.user_id).toBe(testUserId);
    expect(result1.name).toBe('Freelance');
    expect(result2.name).toBe('Groceries');
  });
});
