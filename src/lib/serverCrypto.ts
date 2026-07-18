import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

const normalizeKey = (key: string) => {
  const trimmed = String(key || '').trim();
  if (!trimmed) {
    throw new Error('ETSY_TOKEN_ENCRYPTION_KEY is required for server-side encryption.');
  }

  const decoded = Buffer.from(trimmed, 'base64');
  if (decoded.length !== 32) {
    throw new Error('ETSY_TOKEN_ENCRYPTION_KEY must be a 32-byte base64-encoded key.');
  }

  return decoded;
};

export const encrypt = (plainText: string, base64Key: string): EncryptedPayload => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, normalizeKey(base64Key), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plainText || ''), 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
};

export const decrypt = (payload: EncryptedPayload, base64Key: string) => {
  const decipher = createDecipheriv(
    ALGORITHM,
    normalizeKey(base64Key),
    Buffer.from(payload.iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  const plainText = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return plainText.toString('utf8');
};
