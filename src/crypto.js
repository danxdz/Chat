// Minimal crypto helper using libsodium-wrappers via global sodium already loaded

export function getOrCreateUserSalt(userId, sodium) {
  const key = `kdf_salt_${userId}`
  let b64 = localStorage.getItem(key)
  if (!b64) {
    const salt = sodium.randombytes_buf(16)
    b64 = sodium.to_base64(salt)
    localStorage.setItem(key, b64)
  }
  return sodium.from_base64(b64)
}

export async function deriveKeyFromPin(pin, saltBytes, sodium) {
  const pinBytes = sodium.from_string(pin)
  const key = sodium.crypto_pwhash(
    32,
    pinBytes,
    saltBytes,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  )
  sodium.memzero(pinBytes)
  return key
}

export function encryptJson(obj, key, sodium) {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const plaintext = sodium.from_string(JSON.stringify(obj))
  const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, key)
  sodium.memzero(plaintext)
  return JSON.stringify({ n: sodium.to_base64(nonce), c: sodium.to_base64(cipher) })
}

export function decryptJson(payload, key, sodium) {
  const { n, c } = JSON.parse(payload)
  const nonce = sodium.from_base64(n)
  const cipher = sodium.from_base64(c)
  const plaintext = sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  const out = JSON.parse(sodium.to_string(plaintext))
  sodium.memzero(plaintext)
  return out
}