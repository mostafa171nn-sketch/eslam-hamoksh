import { hash, verify, Algorithm } from '@node-rs/argon2';

const HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

export function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  return verify(hashValue, password);
}
