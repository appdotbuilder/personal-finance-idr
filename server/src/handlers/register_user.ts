
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  try {
    // Check if email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(input.password);

    // Create user in database
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        full_name: input.full_name
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate JWT token with user ID and email
    const payload = {
      user_id: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours expiration
    };

    const secret = process.env['JWT_SECRET'] || 'default_secret_key';
    
    // Create a simple JWT token manually
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    // Simple signature using crypto (available in Bun)
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payloadStr}`)
      .digest('base64url');
    
    const token = `${header}.${payloadStr}.${signature}`;

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}
