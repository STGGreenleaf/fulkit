// ── Token Encryption (AES-256-GCM) ──
// Shared utility for encrypting all secrets at rest:
// BYOK keys, OAuth tokens, refresh tokens, API keys.
// Format: iv:tag:ciphertext (all base64)

import crypto from "crypto";

const ENC_KEY = process.env.BYOK_ENCRYPTION_KEY; // 32-byte hex string

function getKey() {
  if (!ENC_KEY) throw new Error("BYOK_ENCRYPTION_KEY not set");
  const buf = Buffer.from(ENC_KEY, "hex");
  if (buf.length !== 32) throw new Error("BYOK_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return buf;
}

/** Encrypt a plaintext string → iv:tag:ciphertext (base64) */
export function encryptToken(plaintext) {
  if (!plaintext) return plaintext;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a stored token. Migration-safe: if the value doesn't match
 * the iv:tag:ciphertext format, returns it as-is (plaintext legacy).
 */
export function decryptToken(stored) {
  if (!stored) return stored;
  const parts = stored.split(":");
  if (parts.length !== 3) {
    // Plaintext or legacy format — return as-is (will be encrypted on next write)
    return stored;
  }
  try {
    const [ivB64, tagB64, ctB64] = parts;
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return decipher.update(Buffer.from(ctB64, "base64"), null, "utf-8") + decipher.final("utf-8");
  } catch {
    // Decryption failed — might be plaintext that happens to contain colons
    return stored;
  }
}

/** Encrypt a JSON-serializable metadata object */
export function encryptMeta(meta) {
  if (!meta) return meta;
  return encryptToken(JSON.stringify(meta));
}

/** Decrypt a metadata blob back to an object */
export function decryptMeta(stored) {
  if (!stored) return stored;
  if (typeof stored === "object") return stored; // Already parsed (unencrypted legacy)
  try {
    const decrypted = decryptToken(stored);
    return JSON.parse(decrypted);
  } catch {
    // If it's already a JSON string (unencrypted), parse directly
    try { return JSON.parse(stored); } catch { return stored; }
  }
}
