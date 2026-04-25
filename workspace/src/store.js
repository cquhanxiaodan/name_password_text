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

export function exportToCSV(entries) {
  const headers = ['Site', 'Username', 'Password', 'URL', 'Notes', 'Group', 'Created', 'Modified']
  const rows = entries.map(e => [
    `"${(e.site || '').replace(/"/g, '""')}"`,
    `"${(e.username || '').replace(/"/g, '""')}"`,
    `"${(e.password || '').replace(/"/g, '""')}"`,
    `"${(e.url || '').replace(/"/g, '""')}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
    `"${(e.group || 'Default').replace(/"/g, '""')}"`,
    `"${e.created || ''}"`,
    `"${e.modified || ''}"`
  ].join(','))
  return [headers.join(','), ...rows].join('\n')
}

export function exportToJSON(entries) {
  return JSON.stringify(entries, null, 2)
}

export function importFromCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const entries = []

  const keyMap = {
    'url': 'url',
    'website': 'url',
    'site': 'site',
    'name': 'site',
    'title': 'site',
    'username': 'username',
    'user': 'username',
    'login': 'username',
    'email': 'username',
    'password': 'password',
    'pass': 'password',
    'secret': 'password',
    'notes': 'notes',
    'note': 'notes',
    'comment': 'notes',
    'group': 'group',
    'folder': 'group',
    'category': 'group',
    'created': 'created',
    'modified': 'modified',
    'timestamp': 'modified'
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)/g) || []
    const values_clean = values.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
    const entry = {}
    headers.forEach((h, idx) => {
      const mappedKey = keyMap[h]
      if (mappedKey && !entry[mappedKey]) {
        entry[mappedKey] = values_clean[idx] || ''
      }
    })

    const site = entry.site || entry.url || ''
    const password = entry.password || ''

    if (site && password) {
      entries.push({
        site: site,
        username: entry.username || '',
        password: password,
        url: entry.url || '',
        notes: entry.notes || '',
        group: entry.group || 'Default',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      })
    }
  }
  return entries
}

export function analyzePasswordHealth(password) {
  const result = {
    score: 0,
    feedback: [],
    warnings: []
  }
  if (!password) return result

  if (password.length < 8) {
    result.warnings.push('密码长度小于8位')
  } else {
    result.score += 25
  }
  if (password.length >= 12) result.score += 15
  if (password.length >= 16) result.score += 10

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    result.score += 20
  } else if (/[a-z]/.test(password) || /[A-Z]/.test(password)) {
    result.score += 10
  }

  if (/\d/.test(password)) result.score += 15

  if (/[^a-zA-Z0-9]/.test(password)) result.score += 20

  const common = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome']
  if (common.some(c => password.toLowerCase().includes(c))) {
    result.warnings.push('包含常见弱密码')
    result.score = Math.max(0, result.score - 30)
  }

  if (/(.)\1{2,}/.test(password)) {
    result.warnings.push('存在重复字符')
    result.score = Math.max(0, result.score - 10)
  }

  result.score = Math.min(100, result.score)

  if (result.score < 30) result.feedback.push('密码强度很弱')
  else if (result.score < 50) result.feedback.push('密码强度较弱')
  else if (result.score < 70) result.feedback.push('密码强度一般')
  else result.feedback.push('密码强度良好')

  return result
}
