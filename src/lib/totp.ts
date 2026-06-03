import crypto from "node:crypto";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpStepSeconds = 30;
const totpDigits = 6;

export function generateTotpSecret(byteLength = 20) {
  return base32Encode(crypto.randomBytes(byteLength));
}

export function otpauthUri({ issuer, accountName, secret }: { issuer: string; accountName: string; secret: string }) {
  const label = `${issuer}:${accountName}`;
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(totpDigits), period: String(totpStepSeconds) });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function verifyTotpCode({ code, secret, window = 1, now = Date.now() }: { code: string; secret: string; window?: number; now?: number }) {
  const normalizedCode = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedCode)) return false;

  const counter = Math.floor(now / 1000 / totpStepSeconds);
  for (let offset = -window; offset <= window; offset += 1) {
    if (totpAtCounter(secret, counter + offset) === normalizedCode) return true;
  }
  return false;
}

function totpAtCounter(secret: string, counter: number) {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(binary % 10 ** totpDigits).padStart(totpDigits, "0");
}

function base32Encode(buffer: Buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += base32Alphabet[parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(input: string) {
  const cleanInput = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const character of cleanInput) {
    const value = base32Alphabet.indexOf(character);
    if (value === -1) throw new Error("Invalid authenticator secret");
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}
