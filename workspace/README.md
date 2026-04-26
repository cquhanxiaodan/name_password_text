# Password Manager

一个简洁美观的密码管理器，支持本地加密存储、密码生成、导入导出等功能。

---

## 目录

- [快速开始](#快速开始)
- [Web 应用部署](#web-应用部署)
- [浏览器插件部署](#浏览器插件部署)
- [功能介绍](#功能介绍)
- [数据同步方案](#数据同步方案)

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/cquhanxiaodan/name_password_text.git
cd name_password_text
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 即可使用。

---

## Web 应用部署

### 方式一：本地开发

```bash
cd workspace
npm install
npm run dev
```

访问 `http://localhost:5173`

### 方式二：构建生产版本

```bash
cd workspace
npm install
npm run build
```

构建产物在 `dist/` 目录，可部署到任意静态服务器。

### 方式三：使用 Python 启动静态服务器

```bash
cd workspace/dist
python -m http.server 8080
```

访问 `http://localhost:8080`

### 方式四：使用 Node.js 静态服务器

```bash
cd workspace/dist
npx serve .
```

---

## 浏览器插件部署

### Chrome / Edge (Chromium 内核)

#### Step 1：打开扩展管理页面

- **Chrome**: 访问 `chrome://extensions/`
- **Edge**: 访问 `edge://extensions/`

#### Step 2：开启开发者模式

在扩展管理页面右上角，开启「开发者模式」

#### Step 3：加载扩展

1. 点击「加载已解压的扩展程序」
2. 选择项目中的 `browser-extension` 文件夹

#### Step 4：使用插件

1. 点击浏览器工具栏中的扩展图标
2. 首次使用需要导入浏览器密码

### 浏览器插件功能

| 功能 | 说明 |
|------|------|
| 📥 导入浏览器密码 | 从 Chrome/Edge 读取已保存的密码 |
| 🎯 自动填充 | 在网页上自动填充用户名和密码 |
| 🔄 同步到 Web | 将浏览器密码同步到密码管理器 Web |
| 🔍 搜索过滤 | 快速搜索已保存的密码 |
| 📤 CSV 导出 | 导出为 CSV 格式，方便导入其他系统 |

---

## 功能介绍

### 创建保险库

首次使用需要设置主密码，这个密码用于加密你的数据。

**重要**：请记住主密码，丢失将无法恢复数据！

### 添加凭据

1. 点击右上角「+ 添加凭据」
2. 填写网站/应用名称、用户名、密码
3. 可选择生成随机密码

### 密码生成器

点击 ⚡ 按钮可打开密码生成器：

- **密码长度**：8-64 位可调
- **字符类型**：小写字母、大写字母、数字、特殊符号
- **密码短语**：使用多个单词组合

### 导入导出

#### 导出格式

| 格式 | 用途 |
|------|------|
| 🌐 浏览器兼容 CSV | 可直接导入 Chrome/Edge 等浏览器 |
| 📄 完整 CSV | 包含所有字段，适合其他密码管理器 |
| 📋 JSON | 通用格式，适合程序处理 |

#### 导入来源

支持导入以下来源导出的 CSV：
- Chrome / Edge 浏览器
- Firefox 浏览器
- 1Password
- LastPass
- Bitwarden
- 其他支持 CSV 导出的密码管理器

### 主题切换

点击右上角 🎨 按钮可切换 6 种主题颜色：
- 黄褐（默认）
- 蓝色
- 绿色
- 橙色
- 粉色
- 青色

---

## 数据同步方案

由于数据存储在浏览器本地，不同设备间同步需要借助中间方案：

### 方案一：导入/导出 CSV

1. 设备 A：导出数据为 CSV
2. 设备 B：导入 CSV 文件

### 方案二：使用网盘同步

1. 导出 CSV 到 OneDrive / iCloud / Google Drive 等网盘
2. 在另一设备登录网盘下载 CSV
3. 导入到密码管理器

### 方案三：浏览器插件同步

1. Chrome 安装插件，导入浏览器密码
2. 插件支持导出 CSV
3. 导入到 Web 应用

---

## 文件结构

```
workspace/
├── src/
│   ├── main.js       # 主应用逻辑
│   ├── store.js      # 数据存储、加密、导入导出
│   ├── generator.js  # 密码生成器
│   ├── crypto.js     # 加密解密
│   ├── style.css     # 主样式（含主题变量）
│   └── index.css     # 组件样式
├── browser-extension/  # 浏览器插件
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── background.js
│   └── content.js
├── dist/             # 构建产物
└── package.json
```

---

## 技术栈

- **前端框架**：原生 JavaScript（无框架依赖）
- **构建工具**：Vite
- **加密**：AES-GCM（Web Crypto API）
- **存储**：LocalStorage
- **样式**：CSS 变量 + 自定义 CSS

---

## 安全说明

- 密码使用主密码加密后存储在本地
- 数据不会上传到任何服务器
- 导出 CSV 时请注意安全保管文件
- 建议定期备份数据
