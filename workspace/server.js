import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const app = express()
const PORT = 3001

const DATA_FILE = './data/passwords.json'

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const storage = multer.memoryStorage()
const upload = multer({ storage })

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function loadData() {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function saveData(data) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

app.post('/api/register', (req, res) => {
  const token = generateToken()
  const hashedToken = hashToken(token)
  const data = loadData()

  data.users = data.users || {}
  data.users[hashedToken] = {
    created: new Date().toISOString(),
    passwords: []
  }
  saveData(data)

  res.json({ token, message: '注册成功，请妥善保管您的令牌' })
})

app.post('/api/login', (req, res) => {
  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: '需要令牌' })
  }

  const hashedToken = hashToken(token)
  const data = loadData()

  if (!data.users || !data.users[hashedToken]) {
    return res.status(401).json({ error: '令牌无效' })
  }

  res.json({ success: true, passwordCount: data.users[hashedToken].passwords.length })
})

app.get('/api/passwords', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: '需要令牌' })
  }

  const hashedToken = hashToken(token)
  const data = loadData()

  if (!data.users || !data.users[hashedToken]) {
    return res.status(401).json({ error: '令牌无效' })
  }

  res.json({ passwords: data.users[hashedToken].passwords })
})

app.post('/api/import', upload.single('file'), (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: '需要令牌' })
  }

  const hashedToken = hashToken(token)
  const data = loadData()

  if (!data.users || !data.users[hashedToken]) {
    return res.status(401).json({ error: '令牌无效' })
  }

  let passwords = []
  let importedCount = 0

  if (req.file) {
    const csvContent = req.file.buffer.toString('utf-8')
    passwords = parseCSV(csvContent)
  } else if (req.body.passwords) {
    passwords = typeof req.body.passwords === 'string'
      ? JSON.parse(req.body.passwords)
      : req.body.passwords
  }

  const userData = data.users[hashedToken]
  const existingUrls = new Set(userData.passwords.map(p => p.url || p.site))

  for (const p of passwords) {
    if (p.site || p.url) {
      userData.passwords.push({
        site: p.site || p.url || '',
        username: p.username || '',
        password: p.password || '',
        url: p.url || '',
        notes: p.notes || '',
        group: p.group || 'Imported',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      })
      importedCount++
    }
  }

  saveData(data)

  res.json({ success: true, imported: importedCount, total: userData.passwords.length })
})

app.delete('/api/passwords', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: '需要令牌' })
  }

  const hashedToken = hashToken(token)
  const data = loadData()

  if (!data.users || !data.users[hashedToken]) {
    return res.status(401).json({ error: '令牌无效' })
  }

  data.users[hashedToken].passwords = []
  saveData(data)

  res.json({ success: true })
})

function parseCSV(csvContent) {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    })

    const keyMap = {
      'url': 'url', 'website': 'url', 'site': 'site', 'name': 'site',
      'username': 'username', 'user': 'username', 'login': 'username',
      'password': 'password', 'pass': 'password'
    }

    return records.map(record => {
      const result = {}
      Object.keys(record).forEach(key => {
        const mappedKey = keyMap[key.toLowerCase()]
        if (mappedKey) {
          result[mappedKey] = record[key]
        }
      })
      return result
    }).filter(r => r.site || r.url || r.username)
  } catch (e) {
    console.error('CSV parse error:', e)
    return []
  }
}

app.listen(PORT, () => {
  console.log(`密码管理器同步服务器运行在 http://localhost:${PORT}`)
  console.log('')
  console.log('API 接口:')
  console.log('  POST /api/register  - 注册新账号，获取令牌')
  console.log('  POST /api/login    - 验证令牌')
  console.log('  GET  /api/passwords - 获取密码列表')
  console.log('  POST /api/import   - 导入密码 (CSV 或 JSON)')
  console.log('  DELETE /api/passwords - 清空密码')
  console.log('')
  console.log('注意: 数据存储在本地文件 data/passwords.json')
})
