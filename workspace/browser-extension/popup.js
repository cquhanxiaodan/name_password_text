let credentials = []
let syncedCredentials = []
let currentToken = ''
let serverUrl = ''

const browserCountEl = document.getElementById('browserCount')
const syncCountEl = document.getElementById('syncCount')
const credentialListEl = document.getElementById('credentialList')
const searchInputEl = document.getElementById('searchInput')
const serverUrlEl = document.getElementById('serverUrl')
const tokenInputEl = document.getElementById('tokenInput')
const syncBtnEl = document.getElementById('syncBtn')
const fetchBtnEl = document.getElementById('fetchBtn')
const registerBtnEl = document.getElementById('registerBtn')
const loginBtnEl = document.getElementById('loginBtn')
const importBtnEl = document.getElementById('importBtn')
const exportBtnEl = document.getElementById('exportBtn')
const importCsvBtnEl = document.getElementById('importCsvBtn')
const importCsvFileEl = document.getElementById('importCsvFile')
const toastEl = document.getElementById('toast')

function showToast(msg) {
  toastEl.textContent = msg
  toastEl.classList.add('show')
  setTimeout(() => toastEl.classList.remove('show'), 3000)
}

function updateStats() {
  browserCountEl.textContent = credentials.length
  syncCountEl.textContent = syncedCredentials.length
}

function renderList(list) {
  if (list.length === 0) {
    credentialListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${credentials.length === 0 ? '🔐' : '🔍'}</div>
        <p>${credentials.length === 0 ? '点击「导入浏览器密码」开始' : '没有找到匹配的密码'}</p>
      </div>
    `
    return
  }

  credentialListEl.innerHTML = list.map(cred => `
    <div class="list-item" data-username="${escapeHtml(cred.username || '')}" data-password="${escapeHtml(cred.password || '')}" data-url="${escapeHtml(cred.url || cred.site || '')}" data-site="${escapeHtml(cred.site || '')}">
      <div class="list-item-header">
        <span class="site-name">${escapeHtml(cred.site || cred.url || 'Unknown')}</span>
      </div>
      <div class="site-url">${escapeHtml(cred.url || '')}</div>
      <div class="username">${escapeHtml(cred.username || 'No username')}</div>
    </div>
  `).join('')

  credentialListEl.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const data = item.dataset
      fillCredential(data.url, data.username, data.password)
    })
  })
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

async function fillCredential(url, username, password) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'fillCredential',
        username: username,
        password: password,
        url: url
      })
      showToast('已填充到页面')
      window.close()
    }
  } catch (err) {
    showToast('无法填充：请确保在网页上点击')
  }
}

async function apiRequest(endpoint, method = 'GET', body = null, isFile = false) {
  if (!serverUrl) {
    showToast('请先输入服务器地址')
    return null
  }

  const headers = {
    'Authorization': `Bearer ${currentToken}`
  }

  const options = { method, headers }

  if (body) {
    if (isFile) {
      options.body = body
      headers['Content-Type'] = 'multipart/form-data'
    } else {
      options.body = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
  }

  try {
    const response = await fetch(`${serverUrl}${endpoint}`, options)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || '请求失败')
    }
    return data
  } catch (err) {
    showToast('请求失败：' + err.message)
    return null
  }
}

registerBtnEl.addEventListener('click', async () => {
  serverUrl = serverUrlEl.value.trim()
  if (!serverUrl) {
    showToast('请先输入服务器地址')
    return
  }

  showToast('正在注册...')
  const result = await apiRequest('/api/register', 'POST')

  if (result && result.token) {
    currentToken = result.token
    tokenInputEl.value = result.token
    chrome.storage.local.set({ token: result.token, serverUrl })
    showToast('注册成功！令牌已保存')
  }
})

loginBtnEl.addEventListener('click', async () => {
  serverUrl = serverUrlEl.value.trim()
  currentToken = tokenInputEl.value.trim()

  if (!serverUrl || !currentToken) {
    showToast('请输入服务器地址和令牌')
    return
  }

  showToast('正在登录...')
  const result = await apiRequest('/api/login', 'POST', { token: currentToken })

  if (result && result.success) {
    chrome.storage.local.set({ token: currentToken, serverUrl })
    showToast(`登录成功！服务器上有 ${result.passwordCount} 条密码`)
    await loadFromServer()
  }
})

syncBtnEl.addEventListener('click', async () => {
  if (!currentToken) {
    showToast('请先登录')
    return
  }

  if (credentials.length === 0) {
    showToast('没有可同步的密码，请先导入')
    return
  }

  showToast('正在同步...')

  const csvContent = convertToCSV(credentials)
  const formData = new FormData()
  formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'passwords.csv')

  const result = await fetch(`${serverUrl}/api/import`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${currentToken}` },
    body: formData
  }).then(r => r.json()).catch(() => null)

  if (result && result.success) {
    syncedCredentials = [...credentials]
    updateStats()
    showToast(`同步成功！共 ${result.imported} 条密码`)
  } else {
    showToast('同步失败')
  }
})

fetchBtnEl.addEventListener('click', async () => {
  await loadFromServer()
})

async function loadFromServer() {
  if (!currentToken) {
    showToast('请先登录')
    return
  }

  showToast('正在从服务器拉取...')
  const result = await apiRequest('/api/passwords')

  if (result && result.passwords) {
    credentials = result.passwords
    syncedCredentials = [...credentials]
    chrome.storage.local.set({ savedPasswords: credentials })
    updateStats()
    renderList(credentials)
    showToast(`拉取成功！共 ${result.passwords.length} 条密码`)
  }
}

importBtnEl.addEventListener('click', async () => {
  try {
    const result = await chrome.storage.local.get('savedPasswords')
    if (result.savedPasswords && result.savedPasswords.length > 0) {
      credentials = result.savedPasswords
    } else {
      credentials = []
      showToast('浏览器中没有保存的密码')
    }
    updateStats()
    renderList(credentials)
    showToast(`已加载 ${credentials.length} 条密码`)
  } catch (err) {
    showToast('读取失败：' + err.message)
  }
})

searchInputEl.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase()
  if (!query) {
    renderList(credentials)
  } else {
    const filtered = credentials.filter(c =>
      (c.site || '').toLowerCase().includes(query) ||
      (c.url || '').toLowerCase().includes(query) ||
      (c.username || '').toLowerCase().includes(query)
    )
    renderList(filtered)
  }
})

exportBtnEl.addEventListener('click', () => {
  if (credentials.length === 0) {
    showToast('没有可导出的密码')
    return
  }

  const csvContent = convertToCSV(credentials)
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `browser_passwords_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('已导出 CSV 文件')
})

function convertToCSV(entries) {
  const headers = ['name', 'url', 'username', 'password', 'notes']
  const rows = entries.map(e => [
    `"${(e.site || e.url || '').replace(/"/g, '""')}"`,
    `"${(e.url || '').replace(/"/g, '""')}"`,
    `"${(e.username || '').replace(/"/g, '""')}"`,
    `"${(e.password || '').replace(/"/g, '""')}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`
  ].join(','))
  return [headers.join(','), ...rows].join('\n')
}

function parseCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const entries = []

  const keyMap = {
    'url': 'url', 'website': 'url', 'site': 'site', 'name': 'site', 'title': 'site',
    'username': 'username', 'user': 'username', 'login': 'username', 'email': 'username',
    'password': 'password', 'pass': 'password', 'secret': 'password'
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

    if ((entry.site || entry.url) && entry.password) {
      entries.push({
        site: entry.site || entry.url || '',
        username: entry.username || '',
        password: entry.password || '',
        url: entry.url || ''
      })
    }
  }
  return entries
}

importCsvBtnEl.addEventListener('click', () => {
  const file = importCsvFileEl.files[0]
  if (!file) {
    showToast('请先选择 CSV 文件')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const parsed = parseCSV(e.target.result)
    if (parsed.length === 0) {
      showToast('CSV 文件中未找到可导入的密码')
      return
    }
    credentials = [...credentials, ...parsed]
    chrome.storage.local.set({ savedPasswords: credentials }, () => {
      updateStats()
      renderList(credentials)
      showToast(`成功导入 ${parsed.length} 条密码`)
    })
  }
  reader.readAsText(file)
})

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['savedPasswords', 'token', 'serverUrl'], (result) => {
    if (result.savedPasswords) {
      credentials = result.savedPasswords
      updateStats()
      renderList(credentials)
    }
    if (result.token) {
      currentToken = result.token
      tokenInputEl.value = result.token
    }
    if (result.serverUrl) {
      serverUrlEl.value = result.serverUrl
      serverUrl = result.serverUrl
    }
  })

  serverUrlEl.addEventListener('change', () => {
    serverUrl = serverUrlEl.value.trim()
    chrome.storage.local.set({ serverUrl })
  })

  tokenInputEl.addEventListener('change', () => {
    currentToken = tokenInputEl.value.trim()
    chrome.storage.local.set({ token: currentToken })
  })
})
