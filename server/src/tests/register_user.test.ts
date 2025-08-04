
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await registerUser(testInput);

    // Verify user data structure
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);

    // Verify password_hash is not included in response
    expect('password_hash' in result.user).toBe(false);
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.full_name).toEqual('Test User');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123'); // Should be hashed
    expect(savedUser.password_hash.length).toBeGreaterThan(10); // Hashed passwords are longer
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should verify password hash is correctly generated', async () => {
    const result = await registerUser(testInput);

    // Get the saved user with password hash
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    const savedUser = users[0];

    // Verify password can be verified against hash
    const isPasswordValid = await Bun.password.verify('password123', savedUser.password_hash);
    expect(isPasswordValid).toBe(true);

    // Verify wrong password fails verification
    const isWrongPasswordValid = await Bun.password.verify('wrongpassword', savedUser.password_hash);
    expect(isWrongPasswordValid).toBe(false);
  });

  it('should throw error when email already exists', async () => {
    // Register first user
    await registerUser(testInput);

    // Try to register another user with same email
    const duplicateInput: RegisterInput = {
      email: 'test@example.com', // Same email
      password: 'different123',
      full_name: 'Different User'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/email already registered/i);
  });

  it('should handle different email formats correctly', async () => {
    const inputs = [
      { ...testInput, email: 'user@domain.co.id' },
      { ...testInput, email: 'test.user+tag@example.org' },
      { ...testInput, email: 'USER@UPPERCASE.COM' }
    ];

    for (const input of inputs) {
      const result = await registerUser(input);
      expect(result.user.email).toEqual(input.email);
      
      // Clean up for next iteration
      await db.delete(usersTable).where(eq(usersTable.id, result.user.id)).execute();
    }
  });

  it('should generate valid JWT token structure', async () => {
    const result = await registerUser(testInput);

    // JWT should have 3 parts separated by dots
    const tokenParts = result.token.split('.');
    expect(tokenParts).toHaveLength(3);

    // Each part should be base64url encoded and non-empty
    tokenParts.forEach(part => {
      expect(part.length).toBeGreaterThan(0);
      // base64url should not contain +, /, or = characters
      expect(part).not.toMatch(/[+/=]/);
    });

    // Verify we can decode the header and payload
    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());

    expect(header.alg).toEqual('HS256');
    expect(header.typ).toEqual('JWT');
    expect(payload.user_id).toEqual(result.user.id);
    expect(payload.email).toEqual(result.user.email);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should set correct timestamps', async () => {
    const beforeRegistration = new Date();
    const result = await registerUser(testInput);
    const afterRegistration = new Date();

    // Timestamps should be within reasonable range
    expect(result.user.created_at.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime() - 1000);
    expect(result.user.created_at.getTime()).toBeLessThanOrEqual(afterRegistration.getTime() + 1000);
    expect(result.user.updated_at.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime() - 1000);
    expect(result.user.updated_at.getTime()).toBeLessThanOrEqual(afterRegistration.getTime() + 1000);
  });

  it('should handle minimum password length requirement', async () => {
    const shortPasswordInput: RegisterInput = {
      email: 'short@example.com',
      password: '12345', // Only 5 characters, minimum is 6
      full_name: 'Short Password User'
    };

    // Note: The password validation happens at the Zod schema level,
    // but we can still test that longer passwords work fine
    const validInput: RegisterInput = {
      email: 'valid@example.com',
      password: '123456', // Exactly 6 characters (minimum)
      full_name: 'Valid Password User'
    };

    const result = await registerUser(validInput);
    expect(result.user.email).toEqual('valid@example.com');
  });
});
