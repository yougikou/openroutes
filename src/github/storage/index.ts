import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createStore, get, set, del } from 'idb-keyval';
import type { SecureStorage, StoredAccount } from '../types';
import { consoleLogger } from '../logger';

const SERVICE_ACCOUNT = 'github-account';

const safeParse = (value: string | null) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as StoredAccount;
  } catch (error) {
    consoleLogger.warn('Failed to parse stored account');
    return null;
  }
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const KEYTAR_SERVICE = 'openroutes-github-oauth';

let keytarModule: typeof import('keytar') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  keytarModule = require('keytar');
} catch (error) {
  consoleLogger.warn('keytar not available, falling back to encrypted file storage');
}

let nodeCrypto: typeof import('crypto') | null = null;
const getNodeCrypto = () => {
  if (!nodeCrypto) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nodeCrypto = require('crypto');
  }
  return nodeCrypto!;
};

const dataFile = path.join(os.homedir(), '.config', 'openroutes', 'github-oauth.dat');
const keyFile = path.join(os.homedir(), '.config', 'openroutes', 'github-oauth.key');

const generateFileKey = async () => {
  const key = getNodeCrypto().randomBytes(32);
  await ensureDir(path.dirname(keyFile));
  await fs.writeFile(keyFile, key.toString('base64'), { mode: 0o600 });
  return key;
};

const readFileKey = async (): Promise<Buffer> => {
  try {
    const raw = await fs.readFile(keyFile, 'utf8');
    return Buffer.from(raw, 'base64');
  } catch (error) {
    return generateFileKey();
  }
};

const encryptFilePayload = async (account: StoredAccount): Promise<Buffer> => {
  const key = await readFileKey();
  const iv = getNodeCrypto().randomBytes(12);
  const cipher = getNodeCrypto().createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify(account), 'utf8');
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
};

const decryptFilePayload = async (buffer: Buffer): Promise<StoredAccount | null> => {
  const key = await readFileKey();
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  try {
    const decipher = getNodeCrypto().createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted) as StoredAccount;
  } catch (error) {
    consoleLogger.error('Failed to decrypt secure store payload', { error: (error as Error).message });
    return null;
  }
};

/**
 * Secure storage for Node.js / desktop environments. Uses OS keychain via `keytar`
 * when available, otherwise falls back to AES-256-GCM encrypted files under `~/.config/openroutes`.
 */
export class NodeSecureStorage implements SecureStorage {
  constructor(private readonly service = KEYTAR_SERVICE) {}

  async saveAccount(account: StoredAccount): Promise<void> {
    if (keytarModule) {
      await keytarModule.setPassword(this.service, SERVICE_ACCOUNT, JSON.stringify(account));
      return;
    }
    const payload = await encryptFilePayload(account);
    await ensureDir(path.dirname(dataFile));
    await fs.writeFile(dataFile, payload, { mode: 0o600 });
  }

  async getAccount(): Promise<StoredAccount | null> {
    if (keytarModule) {
      const value = await keytarModule.getPassword(this.service, SERVICE_ACCOUNT);
      return safeParse(value);
    }
    try {
      const buffer = await fs.readFile(dataFile);
      return await decryptFilePayload(buffer);
    } catch (error) {
      return null;
    }
  }

  async clear(): Promise<void> {
    if (keytarModule) {
      await keytarModule.deletePassword(this.service, SERVICE_ACCOUNT);
    }
    try {
      await fs.unlink(dataFile);
    } catch (error) {
      // noop
    }
  }
}

const hasWindow = () => typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const KEY_STORAGE = 'github_oauth_encryption_key';
const ACCOUNT_KEY = 'account';

const getWebCrypto = () => {
  const cryptoApi = (globalThis.crypto ?? getNodeCrypto().webcrypto) as Crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('SubtleCrypto not available');
  }
  return cryptoApi;
};

const toBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(view).toString('base64');
  }
  let binary = '';
  view.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(value, 'base64');
    return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  }
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    out[index] = binary.charCodeAt(index);
  }
  return out;
};

const randomIv = () => {
  if (hasWindow()) {
    const array = new Uint8Array(12);
    getWebCrypto().getRandomValues(array);
    return array;
  }
  const buffer = getNodeCrypto().randomBytes(12);
  return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
};

const toArrayBuffer = (view: Uint8Array) => {
  const buffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(buffer).set(view);
  return buffer;
};

const subtleExportKey = async (key: CryptoKey) => {
  const raw = await getWebCrypto().subtle.exportKey('raw', key);
  return toBase64(raw);
};

const subtleImportKey = async (raw: string) => {
  const bytes = fromBase64(raw);
  const copy = bytes.slice();
  const bufferSource = toArrayBuffer(copy) as ArrayBuffer;
  return getWebCrypto().subtle.importKey('raw', bufferSource, 'AES-GCM', true, ['encrypt', 'decrypt']);
};

const subtleEncrypt = async (key: CryptoKey, payload: StoredAccount) => {
  const ivSource = randomIv().slice();
  const data = encoder.encode(JSON.stringify(payload)).slice();
  const encrypted = await getWebCrypto().subtle.encrypt({ name: 'AES-GCM', iv: ivSource }, key, data as unknown as BufferSource);
  return {
    iv: toBase64(ivSource),
    data: toBase64(encrypted),
  };
};

const subtleDecrypt = async (key: CryptoKey, payload: { iv: string; data: string }) => {
  const iv = fromBase64(payload.iv).slice();
  const encrypted = fromBase64(payload.data).slice();
  const result = await getWebCrypto().subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted as unknown as BufferSource);
  return JSON.parse(decoder.decode(result)) as StoredAccount;
};

/**
 * Secure storage for web environments using IndexedDB + AES-GCM, with the encryption key
 * persisted in `sessionStorage` for the active browser session.
 */
export class WebSecureStorage implements SecureStorage {
  private store = createStore('github-oauth', 'accounts');

  private async getCryptoKey(): Promise<CryptoKey> {
    if (!hasWindow()) {
      throw new Error('IndexedDB not available');
    }
    let keyBase64 = window.sessionStorage.getItem(KEY_STORAGE);
    const cryptoApi = getWebCrypto();
    if (!keyBase64) {
      const key = await cryptoApi.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      keyBase64 = await subtleExportKey(key);
      window.sessionStorage.setItem(KEY_STORAGE, keyBase64);
      return key;
    }
    return subtleImportKey(keyBase64);
  }

  async saveAccount(account: StoredAccount): Promise<void> {
    const key = await this.getCryptoKey();
    const payload = await subtleEncrypt(key, account);
    await set(ACCOUNT_KEY, payload, this.store);
  }

  async getAccount(): Promise<StoredAccount | null> {
    try {
      const key = await this.getCryptoKey();
      const payload = await get<{ iv: string; data: string } | undefined>(ACCOUNT_KEY, this.store);
      if (!payload) {
        return null;
      }
      return await subtleDecrypt(key, payload);
    } catch (error) {
      return null;
    }
  }

  async clear(): Promise<void> {
    await del(ACCOUNT_KEY, this.store);
  }
}

/**
 * Simplified in-memory storage (useful for testing).
 */
export class InMemorySecureStorage implements SecureStorage {
  private account: StoredAccount | null = null;

  async saveAccount(account: StoredAccount): Promise<void> {
    this.account = account;
  }

  async getAccount(): Promise<StoredAccount | null> {
    return this.account;
  }

  async clear(): Promise<void> {
    this.account = null;
  }
}

/**
 * Auto-detect the optimal secure storage based on the current runtime.
 *
 * @example
 * const storage = createSecureStorage();
 * await storage.saveAccount(account);
 */
export const createSecureStorage = (): SecureStorage => {
  if (hasWindow()) {
    return new WebSecureStorage();
  }
  return new NodeSecureStorage();
};

