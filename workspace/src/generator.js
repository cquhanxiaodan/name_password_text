const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

const WORDS = [
  'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'harbor',
  'island', 'jungle', 'knight', 'lemon', 'mountain', 'nature', 'ocean', 'palace',
  'quantum', 'river', 'sunset', 'thunder', 'umbrella', 'valley', 'winter', 'xenon',
  'yellow', 'zebra', 'anchor', 'breeze', 'castle', 'diamond', 'ember', 'falcon',
  'glacier', 'horizon', 'ivory', 'jasmine', 'kindle', 'lantern', 'marble', 'nebula',
  'orchid', 'phoenix', 'quartz', 'rainbow', 'silver', 'twilight', 'unity', 'velvet',
  'whisper', 'crystal', 'aurora', 'blossom', 'compass', 'dolphin', 'eclipse',
  'fortune', 'gravity', 'harmony', 'infinity', 'journey', 'kingdom', 'liberty',
  'mystery', 'nectar', 'oracle', 'prism', 'quest', 'radiant', 'stellar', 'temple',
  'vortex', 'wonder', 'zenith', 'cosmic', 'digital', 'enigma', 'fragment', 'galaxy'
]

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

export function generatePassphrase(wordCount = 4, separator = '-') {
  const indices = new Uint32Array(wordCount)
  crypto.getRandomValues(indices)

  let words = []
  for (let i = 0; i < wordCount; i++) {
    words.push(WORDS[indices[i] % WORDS.length])
  }

  const hasUppercase = Math.random() > 0.5
  if (hasUppercase) {
    words = words.map(w => w.charAt(0).toUpperCase() + w.slice(1))
  }

  const addNumber = Math.random() > 0.5
  if (addNumber) {
    const numArr = new Uint32Array(1)
    crypto.getRandomValues(numArr)
    words.push((numArr[0] % 99 + 1).toString())
  }

  return words.join(separator)
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
