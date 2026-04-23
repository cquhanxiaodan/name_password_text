const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

export function generatePassword(length = 16, options = {}) {
  const {
    lowercase = true,
    uppercase = true,
    digits = true,
    symbols = true
  } = options

  let charset = ''
  const required = []
  if (lowercase) { charset += LOWERCASE; required.push(LOWERCASE) }
  if (uppercase) { charset += UPPERCASE; required.push(UPPERCASE) }
  if (digits) { charset += DIGITS; required.push(DIGITS) }
  if (symbols) { charset += SYMBOLS; required.push(SYMBOLS) }

  if (!charset) charset = LOWERCASE + DIGITS

  const array = new Uint32Array(length)
  crypto.getRandomValues(array)

  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset[array[i] % charset.length]
  }

  for (let i = 0; i < required.length && i < length; i++) {
    const randArr = new Uint32Array(1)
    crypto.getRandomValues(randArr)
    const pos = randArr[0] % length
    const charArr = new Uint32Array(1)
    crypto.getRandomValues(charArr)
    result = result.slice(0, pos) + required[i][charArr[0] % required[i].length] + result.slice(pos + 1)
  }

  return result
}

export function generateUsername(length = 8) {
  const vowels = 'aeiou'
  const consonants = 'bcdfghjklmnpqrstvwxyz'
  let username = ''
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  for (let i = 0; i < length; i++) {
    const set = i % 2 === 0 ? consonants : vowels
    username += set[arr[i] % set.length]
  }
  const numArr = new Uint32Array(1)
  crypto.getRandomValues(numArr)
  username += (numArr[0] % 9000 + 1000)
  return username
}
