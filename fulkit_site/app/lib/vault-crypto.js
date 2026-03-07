// Model B: Client-side encryption via Web Crypto API
// AES-GCM encryption with PBKDF2 key derivation
// No npm dependencies — pure browser crypto

const PBKDF2_ITERATIONS = 600000;
const SESSION_KEY = "fulkit-vault-key";

// Generate a random salt for PBKDF2 (stored per-user in preferences)
export function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return uint8ToBase64(salt);
}

// Derive an AES-GCM key from a passphrase + salt
export async function deriveKey(passphrase, saltBase64) {
  const encoder = new TextEncoder();
  const salt = base64ToUint8(saltBase64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable for sessionStorage caching
    ["encrypt", "decrypt"]
  );
}

// Encrypt plaintext content
export async function encryptNote(content, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(content)
  );

  return {
    ciphertext: uint8ToBase64(new Uint8Array(ciphertext)),
    iv: uint8ToBase64(iv),
  };
}

// Decrypt ciphertext back to plaintext
export async function decryptNote(ciphertextBase64, ivBase64, key) {
  const ciphertext = base64ToUint8(ciphertextBase64);
  const iv = base64ToUint8(ivBase64);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// Cache derived key in sessionStorage (survives refresh, not browser close)
export async function cacheKey(key) {
  const exported = await crypto.subtle.exportKey("jwk", key);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(exported));
}

// Retrieve cached key from sessionStorage
export async function getCachedKey() {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const jwk = JSON.parse(stored);
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

// Clear cached key (lock vault)
export function clearCachedKey() {
  sessionStorage.removeItem(SESSION_KEY);
}

// Base64 helpers
function uint8ToBase64(uint8) {
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64) {
  const binary = atob(base64);
  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
}
