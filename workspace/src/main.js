import { generatePassword, generateUsername, generatePassphrase } from './generator.js'
import { saveVault, loadVault, hasVault, clearVault, exportToCSV, exportToCSVFull, exportToJSON, importFromCSV, analyzePasswordHealth } from './store.js'
import './style.css'
import './index.css'

let currentEntries = []
let isUnlocked = false
let masterPassword = ''
let clipboardTimer = null
let showThemeMenu = false
let currentGroup = 'All'

const app = document.getElementById('app')

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

function render() {
  if (!isUnlocked) {
    renderLockScreen()
  } else {
    renderMainScreen()
  }
}

function renderLockScreen() {
  const isFirst = !hasVault()
  app.innerHTML = `
    <div class="lock-screen">
      <div class="lock-card">
        <div class="lock-icon">${isFirst ? '🔐' : '🔒'}</div>
        <h1 class="lock-title">Password Manager</h1>
        <p class="lock-subtitle">${isFirst ? '设置主密码以开始使用' : '输入主密码解锁'}</p>
        <form id="unlock-form">
          <div style="margin-bottom: 16px;">
            <label class="form-label">主密码</label>
            <input type="password" id="master-pw" class="form-input" placeholder="输入主密码" required autocomplete="off" />
          </div>
          ${isFirst ? `
          <div style="margin-bottom: 16px;">
            <label class="form-label">确认密码</label>
            <input type="password" id="master-pw-confirm" class="form-input" placeholder="再次输入主密码" required autocomplete="off" />
          </div>` : ''}
          <button type="submit" class="btn-primary">${isFirst ? '创建保险库' : '解锁'}</button>
          ${!isFirst ? '<button type="button" id="reset-vault" class="btn-ghost" style="width:100%;margin-top:16px;">重置保险库（清除所有数据）</button>' : ''}
        </form>
      </div>
    </div>
  `

  document.getElementById('unlock-form').addEventListener('submit', handleUnlock)

  const resetBtn = document.getElementById('reset-vault')
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('确定要重置保险库吗？所有数据将被永久删除！')) {
        clearVault()
        render()
      }
    })
  }
}

function renderMainScreen() {
  const groups = [...new Set(currentEntries.map(e => e.group || 'Default'))]

  app.innerHTML = `
    <div class="main-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <span class="sidebar-logo-icon">🔐</span>
            <div>
              <div class="sidebar-logo-text">保险库</div>
              <div class="sidebar-count">${currentEntries.length} 个凭据</div>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <button class="nav-item ${currentGroup === 'All' ? 'active' : ''}" data-group="All">
            <span class="nav-item-icon">📁</span>
            <span class="nav-item-text">全部凭据</span>
            <span class="nav-item-count">${currentEntries.length}</span>
          </button>
          ${groups.map(group => {
            const count = currentEntries.filter(e => (e.group || 'Default') === group).length
            return `
              <button class="nav-item ${currentGroup === group ? 'active' : ''}" data-group="${group}">
                <span class="nav-item-icon">📂</span>
                <span class="nav-item-text">${group}</span>
                <span class="nav-item-count">${count}</span>
              </button>
            `
          }).join('')}
        </nav>

        <div style="padding: 16px; border-top: 1px solid #2a2f3e;">
          <button id="export-btn" class="nav-item" style="width: 100%; margin-bottom: 8px;">
            <span class="nav-item-icon">📤</span>
            <span class="nav-item-text">导出数据</span>
          </button>
          <button id="import-btn" class="nav-item" style="width: 100%; margin-bottom: 8px;">
            <span class="nav-item-icon">📥</span>
            <span class="nav-item-text">导入数据</span>
          </button>
          <button id="lock-btn" class="nav-item" style="width: 100%;">
            <span class="nav-item-icon">🔒</span>
            <span class="nav-item-text">锁定保险库</span>
          </button>
        </div>
      </aside>

      <input type="file" id="import-file" accept=".csv,.json" style="display: none;">

      <main class="main-content">
        <header class="main-header">
          <div class="header-top">
            <h2 class="header-title">${currentGroup === 'All' ? '全部凭据' : currentGroup}</h2>
            <div class="header-actions">
              <div style="position: relative;">
                <button id="theme-btn" class="theme-btn">🎨</button>
                <div id="theme-menu" class="theme-menu" style="display: ${showThemeMenu ? 'block' : 'none'};">
                  <div class="theme-menu-title">选择主题</div>
                  <div class="theme-colors">
                    <button class="theme-color-btn" data-theme="mytheme"><span class="theme-color-dot" style="background: #d4c5a9;"></span>黄褐</button>
                    <button class="theme-color-btn" data-theme="blue"><span class="theme-color-dot" style="background: #0984e3;"></span>蓝色</button>
                    <button class="theme-color-btn" data-theme="green"><span class="theme-color-dot" style="background: #00b894;"></span>绿色</button>
                    <button class="theme-color-btn" data-theme="orange"><span class="theme-color-dot" style="background: #e17055;"></span>橙色</button>
                    <button class="theme-color-btn" data-theme="pink"><span class="theme-color-dot" style="background: #fd79a8;"></span>粉色</button>
                    <button class="theme-color-btn" data-theme="teal"><span class="theme-color-dot" style="background: #00cec9;"></span>青色</button>
                  </div>
                </div>
              </div>
              <button id="add-btn" class="add-btn">
                <span>+</span> 添加凭据
              </button>
            </div>
          </div>
          <input type="text" id="search-input" class="search-input" placeholder="🔍  搜索网站、用户名或 URL..." />
        </header>

        <div class="content-body">
          <div id="entry-list" class="entry-list"></div>
        </div>
      </main>
    </div>

    <div id="modal-overlay" class="modal-overlay" style="display: none;">
      <div class="modal-box">
        <h3 id="modal-title" class="modal-title">添加凭据</h3>
        <form id="entry-form" class="modal-form">
          <div>
            <label class="form-label">网站 / 应用名称 <span style="color: #ff6b6b;">*</span></label>
            <input type="text" id="entry-site" class="form-input" placeholder="例如: GitHub" required />
          </div>
          <div>
            <label class="form-label">用户名 / 邮箱</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="entry-user" class="form-input" style="flex: 1;" placeholder="用户名或邮箱" />
              <button type="button" id="gen-username-btn" class="gen-btn">🎲</button>
            </div>
          </div>
          <div>
            <label class="form-label">密码 <span style="color: #ff6b6b;">*</span></label>
            <div style="display: flex; gap: 8px;">
              <input type="password" id="entry-pw" class="form-input" style="flex: 1;" placeholder="密码" required autocomplete="off" />
              <button type="button" id="toggle-pw-btn" class="gen-btn" style="padding: 12px;">👁</button>
              <button type="button" id="gen-password-btn" class="gen-btn">⚡</button>
            </div>
            <div id="password-health" style="margin-top: 8px;"></div>
          </div>
          <div id="pw-options" class="pw-options" style="display: none;">
            <div style="margin-bottom: 12px;">
              <label class="form-label">密码长度: <span id="pw-len-val">16</span></label>
              <input type="range" id="pw-len" class="pw-options-range" min="8" max="64" value="16" />
            </div>
            <div class="pw-options-checkboxes">
              <label><input type="checkbox" id="pw-lower" checked /> 小写</label>
              <label><input type="checkbox" id="pw-upper" checked /> 大写</label>
              <label><input type="checkbox" id="pw-digits" checked /> 数字</label>
              <label><input type="checkbox" id="pw-symbols" checked /> 符号</label>
            </div>
          </div>
          <div>
            <label class="form-label">网址 (URL)</label>
            <input type="url" id="entry-url" class="form-input" placeholder="https://example.com" />
          </div>
          <div>
            <label class="form-label">备注</label>
            <textarea id="entry-notes" class="form-input" style="height: 80px; resize: vertical;" placeholder="添加备注信息..."></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" id="cancel-btn" class="btn btn-cancel">取消</button>
            <button type="submit" id="modal-submit" class="btn btn-save">添加</button>
          </div>
        </form>
      </div>
    </div>
  `

  document.getElementById('add-btn').addEventListener('click', () => openModal())
  document.getElementById('search-input').addEventListener('input', handleSearch)
  document.getElementById('lock-btn').addEventListener('click', handleLock)

  document.getElementById('export-btn').addEventListener('click', () => showExportMenu())
  document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click())
  document.getElementById('import-file').addEventListener('change', handleImportFile)

  document.getElementById('theme-btn').addEventListener('click', (e) => {
    e.stopPropagation()
    showThemeMenu = !showThemeMenu
    document.getElementById('theme-menu').style.display = showThemeMenu ? 'block' : 'none'
  })

  document.querySelectorAll('.theme-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme)
      showThemeMenu = false
      document.getElementById('theme-menu').style.display = 'none'
    })
  })

  document.addEventListener('click', () => {
    showThemeMenu = false
    document.getElementById('theme-menu').style.display = 'none'
  })

  document.querySelectorAll('.nav-item[data-group]').forEach(item => {
    item.addEventListener('click', () => {
      currentGroup = item.dataset.group
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
      item.classList.add('active')
      renderEntries(currentEntries)
    })
  })

  renderEntries(currentEntries)
}

function renderEntries(entries) {
  const list = document.getElementById('entry-list')
  if (!list) return

  let filtered = entries
  if (currentGroup !== 'All') {
    filtered = entries.filter(e => (e.group || 'Default') === currentGroup)
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">暂无凭据</div>
        <div class="empty-desc">点击右上角"添加凭据"按钮开始使用</div>
      </div>
    `
    return
  }

  list.innerHTML = filtered.map((e, i) => {
    const health = analyzePasswordHealth(e.password)
    const healthColor = health.score >= 70 ? '#51cf94' : health.score >= 40 ? '#ffc078' : '#ff6b6b'
    const actualIndex = entries.indexOf(e)

    return `
      <div class="entry-card" data-index="${actualIndex}">
        <div class="entry-header">
          <div class="entry-info">
            <div class="entry-icon">${(e.site || '?').charAt(0).toUpperCase()}</div>
            <div>
              <div class="entry-title">${escapeHtml(e.site)}</div>
              <div class="entry-username">${escapeHtml(e.username || '未设置用户名')}</div>
              ${e.url ? `<a href="${escapeAttr(e.url)}" target="_blank" style="font-size: 12px; color: #d4c5a9;">${escapeHtml(e.url)}</a>` : ''}
            </div>
          </div>
          <div class="entry-actions">
            <button class="icon-btn copy" data-field="username" data-value="${escapeAttr(e.username)}" title="复制用户名">📋</button>
            <button class="icon-btn copy" data-field="password" data-value="${escapeAttr(e.password)}" title="复制密码">🔑</button>
            <button class="icon-btn edit" data-index="${actualIndex}" title="编辑">✏️</button>
            <button class="icon-btn delete" data-index="${actualIndex}" title="删除">🗑️</button>
          </div>
        </div>
        <div class="entry-fields">
          <div class="entry-field">
            <span class="entry-field-label">用户名</span>
            <span class="entry-field-value entry-value" data-masked="true" data-real="${escapeAttr(e.username)}">${maskString(e.username || '')}</span>
            <button class="reveal-btn">👁</button>
          </div>
          <div class="entry-field">
            <span class="entry-field-label">密码</span>
            <span class="entry-field-value entry-value" data-masked="true" data-real="${escapeAttr(e.password)}">${maskString(e.password)}</span>
            <button class="reveal-btn">👁</button>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12px; color: #5c6180;">密码强度:</span>
              <div style="width: 80px; height: 6px; background: #2a2f3e; border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${health.score}%; background: ${healthColor};"></div>
              </div>
              <span style="font-size: 12px; color: ${healthColor};">${health.score >= 70 ? '强' : health.score >= 40 ? '中' : '弱'}</span>
            </div>
            ${e.group && e.group !== 'Default' ? `<span style="font-size: 12px; padding: 4px 8px; background: #232838; border-radius: 6px;">${e.group}</span>` : ''}
          </div>
        </div>
      </div>
    `
  }).join('')

  list.querySelectorAll('.copy').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.value, btn.dataset.field))
  })
  list.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.index)))
  })
  list.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(parseInt(btn.dataset.index)))
  })
  list.querySelectorAll('.reveal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const span = btn.previousElementSibling
      const isMasked = span.dataset.masked === 'true'
      if (isMasked) {
        span.textContent = span.dataset.real
        span.dataset.masked = 'false'
      } else {
        span.textContent = maskString(span.dataset.real)
        span.dataset.masked = 'true'
      }
    })
  })
}

function openModal(editIndex = null) {
  const isEdit = editIndex !== null
  const entry = isEdit ? currentEntries[editIndex] : {
    site: '', username: '', password: '', url: '', notes: '', group: 'Default'
  }

  document.getElementById('modal-title').textContent = isEdit ? '编辑凭据' : '添加凭据'
  document.getElementById('modal-submit').textContent = isEdit ? '保存' : '添加'
  document.getElementById('entry-site').value = entry.site
  document.getElementById('entry-user').value = entry.username
  document.getElementById('entry-pw').value = entry.password
  document.getElementById('entry-url').value = entry.url || ''
  document.getElementById('entry-notes').value = entry.notes || ''

  updatePasswordHealth(entry.password)

  document.getElementById('modal-overlay').style.display = 'flex'

  const form = document.getElementById('entry-form')
  form.onsubmit = (e) => {
    e.preventDefault()
    const site = document.getElementById('entry-site').value.trim()
    const username = document.getElementById('entry-user').value.trim()
    const password = document.getElementById('entry-pw').value
    const url = document.getElementById('entry-url').value.trim()
    const notes = document.getElementById('entry-notes').value.trim()

    if (!site || !password) return

    const now = new Date().toISOString()
    if (isEdit) {
      currentEntries[editIndex] = {
        ...currentEntries[editIndex],
        site, username, password, url, notes,
        modified: now
      }
    } else {
      currentEntries.push({
        site, username, password, url, notes,
        group: 'Default',
        created: now,
        modified: now
      })
    }
    saveAndRefresh()
    closeModal()
  }

  document.getElementById('cancel-btn').onclick = closeModal

  document.getElementById('gen-username-btn').onclick = () => {
    document.getElementById('entry-user').value = generateUsername()
  }

  document.getElementById('gen-password-btn').onclick = () => {
    const options = document.getElementById('pw-options')
    options.style.display = options.style.display === 'none' ? 'block' : 'none'
  }

  document.getElementById('toggle-pw-btn').onclick = () => {
    const pwInput = document.getElementById('entry-pw')
    const toggleBtn = document.getElementById('toggle-pw-btn')
    if (pwInput.type === 'password') {
      pwInput.type = 'text'
      toggleBtn.textContent = '🙈'
    } else {
      pwInput.type = 'password'
      toggleBtn.textContent = '👁'
    }
  }

  document.getElementById('pw-len').oninput = (e) => {
    document.getElementById('pw-len-val').textContent = e.target.value
    updateGeneratedPassword()
  }

  ;['pw-lower', 'pw-upper', 'pw-digits', 'pw-symbols'].forEach(id => {
    document.getElementById(id).onchange = updateGeneratedPassword
  })

  function updateGeneratedPassword() {
    const len = parseInt(document.getElementById('pw-len').value)
    const opts = {
      lowercase: document.getElementById('pw-lower').checked,
      uppercase: document.getElementById('pw-upper').checked,
      digits: document.getElementById('pw-digits').checked,
      symbols: document.getElementById('pw-symbols').checked
    }
    document.getElementById('entry-pw').value = generatePassword(len, opts)
    updatePasswordHealth(document.getElementById('entry-pw').value)
  }

  document.getElementById('entry-pw').addEventListener('input', (e) => {
    updatePasswordHealth(e.target.value)
  })
}

function updatePasswordHealth(password) {
  const health = analyzePasswordHealth(password)
  const el = document.getElementById('password-health')
  if (!password) {
    el.innerHTML = ''
    return
  }
  const color = health.score >= 70 ? '#51cf94' : health.score >= 40 ? '#ffc078' : '#ff6b6b'
  el.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: ${color}15; border-radius: 10px;">
      <div style="flex: 1; height: 6px; background: #2a2f3e; border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${health.score}%; background: ${color};"></div>
      </div>
      <span style="font-size: 14px; font-weight: 500; color: ${color};">${health.score >= 70 ? '强' : health.score >= 40 ? '中' : '弱'}</span>
    </div>
    ${health.warnings.length > 0 ? `<p style="font-size: 12px; color: #ff6b6b; margin-top: 6px;">${health.warnings.join(', ')}</p>` : ''}
  `
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none'
}

async function handleUnlock(e) {
  e.preventDefault()
  const pw = document.getElementById('master-pw').value
  const isFirst = !hasVault()

  if (isFirst) {
    const confirmPw = document.getElementById('master-pw-confirm').value
    if (pw !== confirmPw) {
      alert('两次输入的密码不一致')
      return
    }
    if (pw.length < 6) {
      alert('主密码至少需要6个字符')
      return
    }
    currentEntries = []
    masterPassword = pw
    await saveVault(currentEntries, pw)
  } else {
    try {
      currentEntries = await loadVault(pw)
      masterPassword = pw
    } catch {
      alert('主密码错误')
      return
    }
  }

  isUnlocked = true
  render()
}

function handleLock() {
  isUnlocked = false
  currentEntries = []
  masterPassword = ''
  render()
}

async function handleDelete(index) {
  if (!confirm('确定删除此条目？')) return
  currentEntries.splice(index, 1)
  await saveAndRefresh()
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase()
  const filtered = currentEntries.filter(entry =>
    (entry.site || '').toLowerCase().includes(query) ||
    (entry.username || '').toLowerCase().includes(query) ||
    (entry.url || '').toLowerCase().includes(query) ||
    (entry.notes || '').toLowerCase().includes(query)
  )
  renderEntries(filtered)
}

async function saveAndRefresh() {
  await saveVault(currentEntries, masterPassword)
  render()
}

function copyToClipboard(text, field) {
  if (clipboardTimer) clearTimeout(clipboardTimer)

  navigator.clipboard.writeText(text).then(() => {
    const names = { username: '用户名', password: '密码' }
    showToast(`${names[field] || field}已复制，30秒后自动清除`)

    clipboardTimer = setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {})
      showToast('剪贴板已自动清除')
    }, 30000)
  })
}

function showToast(msg) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function maskString(str) {
  if (!str) return '********'
  return '*'.repeat(Math.max(str.length, 8))
}

function showExportMenu() {
  const menu = document.createElement('div')
  menu.className = 'export-menu'
  menu.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ffffff;
    border: 1px solid #e8e4df;
    border-radius: 16px;
    padding: 24px;
    z-index: 2000;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    min-width: 280px;
  `
  menu.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 16px;">导出数据</h3>
    <button id="export-csv-browser" class="btn btn-save" style="width: 100%; margin-bottom: 8px; display: block; font-size: 14px;">🌐 浏览器兼容格式 (CSV)</button>
    <button id="export-csv-full" class="btn btn-save" style="width: 100%; margin-bottom: 8px; display: block; font-size: 14px;">📄 完整格式 (CSV)</button>
    <button id="export-json" class="btn btn-save" style="width: 100%; margin-bottom: 8px; display: block; font-size: 14px;">📋 通用格式 (JSON)</button>
    <button id="export-cancel" class="btn btn-cancel" style="width: 100%; display: block;">取消</button>
  `

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1999;'
  overlay.onclick = () => {
    overlay.remove()
    menu.remove()
  }

  document.body.appendChild(overlay)
  document.body.appendChild(menu)

  document.getElementById('export-csv-browser').onclick = () => {
    exportData('csv-browser')
    overlay.remove()
    menu.remove()
  }
  document.getElementById('export-csv-full').onclick = () => {
    exportData('csv-full')
    overlay.remove()
    menu.remove()
  }
  document.getElementById('export-json').onclick = () => {
    exportData('json')
    overlay.remove()
    menu.remove()
  }
  document.getElementById('export-cancel').onclick = () => {
    overlay.remove()
    menu.remove()
  }
}

function exportData(format) {
  let data, filename, mime
  if (format === 'csv-browser') {
    data = exportToCSV(currentEntries)
    filename = `passwords_browser_${new Date().toISOString().slice(0,10)}.csv`
    mime = 'text/csv'
  } else if (format === 'csv-full') {
    data = exportToCSVFull(currentEntries)
    filename = `passwords_full_${new Date().toISOString().slice(0,10)}.csv`
    mime = 'text/csv'
  } else {
    data = exportToJSON(currentEntries)
    filename = `passwords_${new Date().toISOString().slice(0,10)}.json`
    mime = 'application/json'
  }
  const blob = new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  const formatName = format === 'csv-browser' ? '浏览器兼容CSV' : format === 'csv-full' ? '完整CSV' : 'JSON'
  showToast(`数据已导出为 ${formatName} 格式`)
}

function handleImportFile(e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target.result
    let imported = []

    try {
      if (file.name.endsWith('.csv')) {
        imported = importFromCSV(content)
      } else if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(content)
        imported = Array.isArray(parsed) ? parsed : parsed.entries || []
      }

      if (imported.length === 0) {
        showToast('未找到可导入的数据')
        return
      }

      const merged = [...currentEntries, ...imported.map(e => ({
        ...e,
        id: Date.now() + Math.random(),
        created: e.created || new Date().toISOString(),
        modified: new Date().toISOString()
      }))]

      currentEntries = merged
      saveVault(currentEntries, masterPassword).then(() => {
        renderEntries(currentEntries)
        showToast(`成功导入 ${imported.length} 条数据`)
      })
    } catch (err) {
      showToast('导入失败：文件格式错误')
      console.error(err)
    }

    e.target.value = ''
  }
  reader.readAsText(file)
}

applyTheme(localStorage.getItem('theme') || 'mytheme')
render()
