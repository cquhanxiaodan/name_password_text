(function() {
  'use strict'

  let lastFilledUsername = ''
  let lastFilledPassword = ''

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fillCredential') {
      fillForm(message.username, message.password)
      sendResponse({ success: true })
    }

    if (message.action === 'getPageInfo') {
      sendResponse({
        url: window.location.href,
        title: document.title
      })
    }
  })

  function fillForm(username, password) {
    if (!username && !password) return

    lastFilledUsername = username || ''
    lastFilledPassword = password || ''

    const selectors = {
      username: [
        'input[type="text"][name*="user" i]',
        'input[type="text"][name*="email" i]',
        'input[type="text"][name*="login" i]',
        'input[type="text"][name*="account" i]',
        'input[name="username"]',
        'input[name="login"]',
        'input[name="email"]',
        'input[id*="user" i]',
        'input[id*="email" i]',
        'input[id*="login" i]',
        'input[autocomplete="username"]',
        'input[autocomplete="email"]',
        'input[autocomplete="off"]'
      ],
      password: [
        'input[type="password"][name*="pass" i]',
        'input[type="password"][name*="pwd" i]',
        'input[type="password"][name*="secret" i]',
        'input[name="password"]',
        'input[name="pwd"]',
        'input[id*="password" i]',
        'input[autocomplete="current-password"]',
        'input[autocomplete="new-password"]'
      ]
    }

    let usernameField = null
    let passwordField = null

    for (const selector of selectors.username) {
      const field = document.querySelector(selector)
      if (field && isVisible(field) && !field.disabled && !field.readOnly) {
        usernameField = field
        break
      }
    }

    for (const selector of selectors.password) {
      const field = document.querySelector(selector)
      if (field && isVisible(field) && !field.disabled && !field.readOnly) {
        passwordField = field
        break
      }
    }

    if (usernameField && username) {
      usernameField.value = username
      usernameField.dispatchEvent(new Event('input', { bubbles: true }))
      usernameField.dispatchEvent(new Event('change', { bubbles: true }))
    }

    if (passwordField && password) {
      passwordField.value = password
      passwordField.dispatchEvent(new Event('input', { bubbles: true }))
      passwordField.dispatchEvent(new Event('change', { bubbles: true }))
    }

    if (usernameField || passwordField) {
      showNotification(`已填充${username ? '用户名' : ''}${username && password ? '和' : ''}${password ? '密码' : ''}`)
    }
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           element.offsetParent !== null
  }

  function showNotification(message) {
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #d4c5a9, #c9b89a);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 999999;
      animation: slideIn 0.3s ease;
    `
    notification.textContent = message
    document.body.appendChild(notification)

    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `
    document.head.appendChild(style)

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => notification.remove(), 300)
    }, 2500)
  }

  document.addEventListener('submit', (e) => {
    if (lastFilledUsername || lastFilledPassword) {
      const form = e.target
      const usernameInput = form.querySelector('input[type="text"], input[type="email"]')
      const passwordInput = form.querySelector('input[type="password"]')

      if (usernameInput || passwordInput) {
        chrome.runtime.sendMessage({
          action: 'credentialSubmitted',
          username: usernameInput?.value || lastFilledUsername,
          password: passwordInput?.value || lastFilledPassword,
          url: window.location.href
        })
      }
    }
  }, true)
})()
