chrome.runtime.onInstalled.addListener(() => {
  console.log('密码管理器助手已安装')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getCredentials') {
    chrome.storage.local.get('savedPasswords', (result) => {
      sendResponse(result.savedPasswords || [])
    })
    return true
  }

  if (message.action === 'saveCredentials') {
    chrome.storage.local.set({ savedPasswords: message.credentials }, () => {
      sendResponse({ success: true })
    })
    return true
  }

  if (message.action === 'fillCredential') {
    sendResponse({ success: true })
  }
})
