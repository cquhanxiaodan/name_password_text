import { encrypt, decrypt } from './crypto.js'

const STORAGE_KEY = 'npm_vault'

export async function saveVault(entries, masterPassword) {
  const json = JSON.stringify(entries)
  const encrypted = await encrypt(json, masterPassword)
  localStorage.setItem(STORAGE_KEY, encrypted)
}

export async function loadVault(masterPassword) {
  const encrypted = localStorage.getItem(STORAGE_KEY)
  if (!encrypted) return []
  const json = await decrypt(encrypted, masterPassword)
  return JSON.parse(json)
}

export function hasVault() {
  return !!localStorage.getItem(STORAGE_KEY)
}

export function clearVault() {
  localStorage.removeItem(STORAGE_KEY)
}
