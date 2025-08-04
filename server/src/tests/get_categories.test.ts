
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return categories for a specific user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hash1',
          full_name: 'User One'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hash2',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create categories for both users
    await db.insert(categoriesTable)
      .values([
        {
          user_id: user1.id,
          name: 'Salary',
          type: 'income',
          color: '#4CAF50'
        },
        {
          user_id: user1.id,
          name: 'Food',
          type: 'expense',
          color: '#F44336'
        },
        {
          user_id: user2.id,
          name: 'Rent',
          type: 'expense',
          color: '#2196F3'
        }
      ])
      .execute();

    const result = await getCategories(user1.id);

    // Should only return categories for user1
    expect(result).toHaveLength(2);
    expect(result.every(category => category.user_id === user1.id)).toBe(true);
    
    const categoryNames = result.map(cat => cat.name).sort();
    expect(categoryNames).toEqual(['Food', 'Salary']);
  });

  it('should return empty array when user has no categories', async () => {
    // Create user without categories
    const user = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash',
        full_name: 'User'
      })
      .returning()
      .execute();

    const result = await getCategories(user[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return categories with all expected fields', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash',
        full_name: 'User'
      })
      .returning()
      .execute();

    // Create category
    await db.insert(categoriesTable)
      .values({
        user_id: user[0].id,
        name: 'Groceries',
        type: 'expense',
        color: '#FF9800'
      })
      .execute();

    const result = await getCategories(user[0].id);

    expect(result).toHaveLength(1);
    const category = result[0];
    
    expect(category.id).toBeDefined();
    expect(category.user_id).toEqual(user[0].id);
    expect(category.name).toEqual('Groceries');
    expect(category.type).toEqual('expense');
    expect(category.color).toEqual('#FF9800');
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should return both income and expense categories', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash',
        full_name: 'User'
      })
      .returning()
      .execute();

    // Create both types of categories
    await db.insert(categoriesTable)
      .values([
        {
          user_id: user[0].id,
          name: 'Salary',
          type: 'income',
          color: null
        },
        {
          user_id: user[0].id,
          name: 'Freelance',
          type: 'income',
          color: '#4CAF50'
        },
        {
          user_id: user[0].id,
          name: 'Food',
          type: 'expense',
          color: '#F44336'
        }
      ])
      .execute();

    const result = await getCategories(user[0].id);

    expect(result).toHaveLength(3);
    
    const incomeCategories = result.filter(cat => cat.type === 'income');
    const expenseCategories = result.filter(cat => cat.type === 'expense');
    
    expect(incomeCategories).toHaveLength(2);
    expect(expenseCategories).toHaveLength(1);
    
    // Check nullable color field
    const nullColorCategory = result.find(cat => cat.name === 'Salary');
    expect(nullColorCategory?.color).toBeNull();
  });
});
