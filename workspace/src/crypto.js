const SALT_LENGTH = 16
const IV_LENGTH = 12
const PBKDF2_ITERATIONS = 100000

function arrayToBase64(arr) {
  return btoa(String.fromCharCode(...arr))
}

function base64ToArray(b64) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)
  const enc = new TextEncoder()
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(data)
  )
  const cipher = new Uint8Array(cipherBuffer)
  const combined = new Uint8Array(salt.length + iv.length + cipher.length)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(cipher, salt.length + iv.length)
  return arrayToBase64(combined)
}

export async function decrypt(encryptedBase64, password) {
  const combined = base64ToArray(encryptedBase64)
  const salt = combined.slice(0, SALT_LENGTH)
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const cipher = combined.slice(SALT_LENGTH + IV_LENGTH)
  const key = await deriveKey(password, salt)
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new TextDecoder().decode(dec)
}
