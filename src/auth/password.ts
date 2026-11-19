import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// scrypt is built into Node, so there's no native module to compile.
// Parameters follow OWASP's recommendation (N=2^17, r=8, p=1) and are stored
// in the hash so they can be raised later without breaking old passwords.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEMORY = 256 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer, keyLength: number, params: typeof PARAMS): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { ...params, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

// Format: scrypt$N$r$p$salt$key (salt and key in base64)
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, saltB64, keyB64] = stored.split('$');
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltB64 || !keyB64) return false;

  const expected = Buffer.from(keyB64, 'base64');
  const actual = await deriveKey(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(actual, expected);
}

// Used when the email doesn't exist, so a failed login takes the same time
// either way and doesn't reveal which emails have accounts.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(password, await dummyHash);
}
