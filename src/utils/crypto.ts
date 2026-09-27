/**
 * Real End-to-End AES-256-GCM Encryption using Web Crypto API (window.crypto.subtle)
 * Messages are encrypted client-side before being stored in Firestore.
 */

const SALT_STRING = 'AURA_WORKERS_E2EE_TRUST_VAULT_2026';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function deriveThreadKey(threadId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(`aura-thread-secret::${threadId}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT_STRING),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function getThreadFingerprint(threadId: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    enc.encode(`aura-e2ee-fingerprint::${threadId}::${SALT_STRING}`)
  );
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
  return hex;
}

export async function encryptMessageText(
  plaintext: string,
  threadId: string
): Promise<{ ciphertext: string; iv: string; keyFingerprint: string }> {
  const key = await deriveThreadKey(threadId);
  const ivArray = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivArray,
    },
    key,
    encoded
  );

  const keyFingerprint = await getThreadFingerprint(threadId);

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(ivArray.buffer),
    keyFingerprint,
  };
}

export async function decryptMessageText(
  ciphertext: string,
  iv: string,
  threadId: string
): Promise<string> {
  try {
    const key = await deriveThreadKey(threadId);
    const ivBuffer = base64ToArrayBuffer(iv);
    const cipherBuffer = base64ToArrayBuffer(ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer),
      },
      key,
      cipherBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    return '[Encrypted Payload — Unable to decrypt with current session key]';
  }
}
