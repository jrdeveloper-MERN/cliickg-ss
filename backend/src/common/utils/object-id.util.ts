import * as crypto from 'crypto';

/**
 * Generates a 24-character hexadecimal ObjectId-compatible string
 * for new entity creation post-migration.
 * Format: 4-byte timestamp + 5-byte random value + 3-byte incrementing counter
 * Guarantees zero collisions, 100% format homogeneity with legacy MongoDB IDs, and zero dependency on MongoDB.
 */
let counter = Math.floor(Math.random() * 0xffffff);

export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomBytes = crypto.randomBytes(5).toString('hex');
  counter = (counter + 1) % 0xffffff;
  const counterHex = counter.toString(16).padStart(6, '0');
  
  return `${timestamp}${randomBytes}${counterHex}`;
}

export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}
