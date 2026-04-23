import { generatePassword, generateUsername } from './generator.js'
import { saveVault, loadVault, hasVault, clearVault } from './store.js'

let currentEntries = []
let isUnlocked = false
let masterPassword = ''

const app = document.getElementById('app')

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
        <div class="lock-icon">${isFirst ? '&#128274;' : '&#128272;'}</div>
        <h1>Name Password Manager</h1>
        <p class="subtitle">${isFirst ? '设置主密码以开始使用' : '输入主密码解锁'}</p>
        <form id="unlock-form">
          <div class="input-group">
            <label for="master-pw">主密码</label>
            <div class="pw-wrapper">
              <input type="password" id="master-pw" placeholder="输入主密码" required autocomplete="off" />
              <button type="button" class="toggle-pw" data-target="master-pw">&#128065;</button>
            </div>
          </div>
          ${isFirst ? `
          <div class="input-group">
            <label for="master-pw-confirm">确认主密码</label>
            <div class="pw-wrapper">
              <input type="password" id="master-pw-confirm" placeholder="再次输入主密码" required autocomplete="off" />
              <button type="button" class="toggle-pw" data-target="master-pw-confirm">&#128065;</button>
            </div>
          </div>` : ''}
          <button type="submit" class="btn-primary">${isFirst ? '创建保险库' : '解锁'}</button>
        </form>
        ${!isFirst ? '<button id="reset-vault" class="btn-danger-link">重置保险库（清除所有数据）</button>' : ''}
      </div>
    </div>
  `
  document.getElementById('unlock-form').addEventListener('submit', handleUnlock)
  app.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target)
      input.type = input.type === 'password' ? 'text' : 'password'
    })
  })
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
  app.innerHTML = `
    <div class="main-screen">
      <header>
        <h1>Name Password Manager</h1>
        <button id="lock-btn" class="btn-secondary">&#128274; 锁定</button>
      </header>
      <div class="toolbar">
        <input type="text" id="search-input" placeholder="搜索网站..." autocomplete="off" />
        <button id="add-btn" class="btn-primary">+ 添加</button>
      </div>
      <div id="entry-list" class="entry-list"></div>
      <div id="modal-overlay" class="modal-overlay hidden">
        <div class="modal" id="modal"></div>
      </div>
    </div>
  `
  document.getElementById('lock-btn').addEventListener('click', handleLock)
  document.getElementById('add-btn').addEventListener('click', () => openModal())
  document.getElementById('search-input').addEventListener('input', handleSearch)
  renderEntries(currentEntries)
}

function renderEntries(entries) {
  const list = document.getElementById('entry-list')
  if (!list) return
  if (entries.length === 0) {
    list.innerHTML = '<div class="empty-state">暂无凭据，点击"+ 添加"开始</div>'
    return
  }
  list.innerHTML = entries.map((e, i) => `
    <div class="entry-card" data-index="${i}">
      <div class="entry-header">
        <span class="entry-site">${escapeHtml(e.site)}</span>
        <div class="entry-actions">
          <button class="btn-icon copy-btn" data-field="username" data-value="${escapeAttr(e.username)}" title="复制用户名">&#128203;</button>
          <button class="btn-icon copy-btn" data-field="password" data-value="${escapeAttr(e.password)}" title="复制密码">&#128203;</button>
          <button class="btn-icon edit-btn" data-index="${i}" title="编辑">&#9998;</button>
          <button class="btn-icon delete-btn" data-index="${i}" title="删除">&#128465;</button>
        </div>
      </div>
      <div class="entry-body">
        <div class="entry-field">
          <label>用户名</label>
          <span class="entry-value" data-masked="true" data-real="${escapeAttr(e.username)}">${maskString(e.username)}</span>
          <button class="btn-icon reveal-btn" title="显示/隐藏">&#128065;</button>
        </div>
        <div class="entry-field">
          <label>密码</label>
          <span class="entry-value" data-masked="true" data-real="${escapeAttr(e.password)}">${maskString(e.password)}</span>
          <button class="btn-icon reveal-btn" title="显示/隐藏">&#128065;</button>
        </div>
      </div>
    </div>
  `).join('')

  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.value, btn.dataset.field))
  })
  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.index)))
  })
  list.querySelectorAll('.delete-btn').forEach(btn => {
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
  const entry = isEdit ? currentEntries[editIndex] : { site: '', username: '', password: '' }
  const modal = document.getElementById('modal')
  const overlay = document.getElementById('modal-overlay')

  modal.innerHTML = `
    <h2>${isEdit ? '编辑凭据' : '添加凭据'}</h2>
    <form id="entry-form">
      <div class="input-group">
        <label for="entry-site">网站/应用名称</label>
        <input type="text" id="entry-site" value="${escapeAttr(entry.site)}" placeholder="例如: GitHub" required />
      </div>
      <div class="input-group">
        <label for="entry-user">用户名</label>
        <div class="gen-row">
          <input type="text" id="entry-user" value="${escapeAttr(entry.username)}" placeholder="用户名" required />
          <button type="button" id="gen-username-btn" class="btn-secondary">生成</button>
        </div>
      </div>
      <div class="input-group">
        <label for="entry-pw">密码</label>
        <div class="gen-row">
          <div class="pw-wrapper">
            <input type="password" id="entry-pw" value="${escapeAttr(entry.password)}" placeholder="密码" required autocomplete="off" />
            <button type="button" class="toggle-pw" data-target="entry-pw">&#128065;</button>
          </div>
          <button type="button" id="gen-password-btn" class="btn-secondary">生成</button>
        </div>
      </div>
      <div id="pw-options" class="pw-options hidden">
        <div class="option-row">
          <label>长度: <span id="pw-len-val">16</span></label>
          <input type="range" id="pw-len" min="8" max="32" value="16" />
        </div>
        <div class="option-row">
          <label><input type="checkbox" id="pw-lower" checked /> 小写字母</label>
          <label><input type="checkbox" id="pw-upper" checked /> 大写字母</label>
          <label><input type="checkbox" id="pw-digits" checked /> 数字</label>
          <label><input type="checkbox" id="pw-symbols" checked /> 特殊字符</label>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" id="cancel-btn" class="btn-secondary">取消</button>
        <button type="submit" class="btn-primary">${isEdit ? '保存' : '添加'}</button>
      </div>
    </form>
  `

  overlay.classList.remove('hidden')

  document.getElementById('cancel-btn').addEventListener('click', closeModal)
  document.getElementById('gen-username-btn').addEventListener('click', () => {
    document.getElementById('entry-user').value = generateUsername()
  })
  document.getElementById('gen-password-btn').addEventListener('click', () => {
    document.getElementById('pw-options').classList.toggle('hidden')
  })
  document.getElementById('pw-len').addEventListener('input', (e) => {
    document.getElementById('pw-len-val').textContent = e.target.value
    fillGeneratedPassword()
  })
  ;['pw-lower', 'pw-upper', 'pw-digits', 'pw-symbols'].forEach(id => {
    document.getElementById(id).addEventListener('change', fillGeneratedPassword)
  })
  modal.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target)
      input.type = input.type === 'password' ? 'text' : 'password'
    })
  })

  document.getElementById('entry-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const site = document.getElementById('entry-site').value.trim()
    const username = document.getElementById('entry-user').value.trim()
    const password = document.getElementById('entry-pw').value
    if (!site || !username || !password) return
    if (isEdit) {
      currentEntries[editIndex] = { site, username, password }
    } else {
      currentEntries.push({ site, username, password })
    }
    saveAndRefresh()
    closeModal()
  })

  function fillGeneratedPassword() {
    const len = parseInt(document.getElementById('pw-len').value)
    const opts = {
      lowercase: document.getElementById('pw-lower').checked,
      uppercase: document.getElementById('pw-upper').checked,
      digits: document.getElementById('pw-digits').checked,
      symbols: document.getElementById('pw-symbols').checked
    }
    document.getElementById('entry-pw').value = generatePassword(len, opts)
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay')
  if (overlay) overlay.classList.add('hidden')
}

async function handleUnlock(e) {
  e.preventDefault()
  const pw = document.getElementById('master-pw').value
  const isFirst = !hasVault()

  if (isFirst) {
    const confirm = document.getElementById('master-pw-confirm').value
    if (pw !== confirm) {
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
    entry.site.toLowerCase().includes(query) ||
    entry.username.toLowerCase().includes(query)
  )
  renderEntries(filtered)
}

async function saveAndRefresh() {
  await saveVault(currentEntries, masterPassword)
  renderEntries(currentEntries)
}

function copyToClipboard(text, field) {
  navigator.clipboard.writeText(text).then(() => {
    const names = { username: '用户名', password: '密码' }
    showToast(`${names[field] || field}已复制`)
  })
}

function showToast(msg) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
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
  return '*'.repeat(Math.max(str.length, 4))
}

render()
