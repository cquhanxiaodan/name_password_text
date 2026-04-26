let credentials = []
let syncedCredentials = []

const browserCountEl = document.getElementById('browserCount')
const syncCountEl = document.getElementById('syncCount')
const credentialListEl = document.getElementById('credentialList')
const searchInputEl = document.getElementById('searchInput')
const serverUrlEl = document.getElementById('serverUrl')
const syncBtnEl = document.getElementById('syncBtn')
const importBtnEl = document.getElementById('importBtn')
const exportBtnEl = document.getElementById('exportBtn')
const importCsvBtnEl = document.getElementById('importCsvBtn')
const importCsvFileEl = document.getElementById('importCsvFile')
const toastEl = document.getElementById('toast')

function showToast(msg) {
  toastEl.textContent = msg
  toastEl.classList.add('show')
  setTimeout(() => toastEl.classList.remove('show'), 2500)
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
    await chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
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
    })
  } catch (err) {
    showToast('无法填充：请确保在网页上点击')
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
    console.error(err)
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

syncBtnEl.addEventListener('click', async () => {
  const serverUrl = serverUrlEl.value.trim()
  if (!serverUrl) {
    showToast('请输入服务器地址')
    return
  }

  if (credentials.length === 0) {
    showToast('没有可同步的密码，请先导入')
    return
  }

  try {
    const csvContent = convertToCSV(credentials)
    const formData = new FormData()
    formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'import.csv')

    const response = await fetch(`${serverUrl}/api/import`, {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      syncedCredentials = [...credentials]
      updateStats()
      showToast(`成功同步 ${credentials.length} 条密码`)
    } else {
      showToast('同步失败：服务器返回错误')
    }
  } catch (err) {
    showToast('同步失败：' + err.message)
  }
})

exportBtnEl.addEventListener('click', async () => {
  const serverUrl = serverUrlEl.value.trim()
  if (!serverUrl) {
    showToast('请输入服务器地址')
    return
  }

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
  showToast('已导出 CSV 文件，可导入到密码管理器')
})

function convertToCSV(entries) {
  const headers = ['name', 'url', 'username', 'password', 'notes']
  const rows = entries.map(e => [
    `"${(e.site || e.url || '').replace(/"/g, '""')}"`,
    `"${(e.url || '').replace(/"/g, '""')}"`,
    `"${(e.username || '').replace(/"/g, '""')}"`,
    `"${(e.password || '').replace(/"/g, '""')}"`,
    `""`
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

    const site = entry.site || entry.url || ''
    const password = entry.password || ''

    if (site && password) {
      entries.push({
        site: site,
        username: entry.username || '',
        password: password,
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
    credentials = parsed
    chrome.storage.local.set({ savedPasswords: credentials }, () => {
      updateStats()
      renderList(credentials)
      showToast(`成功导入 ${credentials.length} 条密码`)
    })
  }
  reader.readAsText(file)
})

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['savedPasswords', 'serverUrl'], (result) => {
    if (result.savedPasswords) {
      credentials = result.savedPasswords
      updateStats()
      renderList(credentials)
    }
    if (result.serverUrl) {
      serverUrlEl.value = result.serverUrl
    }
  })

  serverUrlEl.addEventListener('change', () => {
    chrome.storage.local.set({ serverUrl: serverUrlEl.value })
  })
})
