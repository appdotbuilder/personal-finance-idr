
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'john.doe@example.com',
  password_hash: 'test_password_123',
  full_name: 'John Doe'
};

const testInput: LoginInput = {
  email: 'john.doe@example.com',
  password: 'test_password_123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(testInput);

    // Verify user data
    expect(result.user.email).toEqual('john.doe@example.com');
    expect(result.user.full_name).toEqual('John Doe');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token).toMatch(/^jwt_token_\d+_\d+$/);

    // Verify password hash is not included
    expect('password_hash' in result.user).toBe(false);
  });

  it('should throw error for non-existent email', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'any_password'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for wrong password', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: LoginInput = {
      email: 'john.doe@example.com',
      password: 'wrong_password'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should return unique tokens for multiple logins', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result1 = await loginUser(testInput);
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result2 = await loginUser(testInput);

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.user.id).toEqual(result2.user.id);
  });
});
