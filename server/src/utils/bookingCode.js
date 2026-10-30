import { customAlphabet } from 'nanoid';

// Uppercase letters and numbers excluding confusing characters like 0/O, 1/I/L
const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generateNanoid = customAlphabet(alphabet, 6);

/**
 * Generates a clean, short, human-readable booking code.
 * Example: 'IMV-7K9P2X'
 */
export function generateBookingCode() {
  return `IMV-${generateNanoid()}`;
}
