/**
 * API Keys management - stored in localStorage
 */

export interface ApiKeys {
  openai?: string
  openrouter?: string
  firecrawl?: string
  zep?: string
}

const STORAGE_KEY = 'docchat_api_keys'

/**
 * Sanitize API key - remove non-ASCII characters, trim whitespace
 */
function sanitizeApiKey(key: string | undefined): string | undefined {
  if (!key) return undefined
  // Trim whitespace and remove non-ASCII characters
  const cleaned = key.trim().replace(/[^\x00-\x7F]/g, '')
  return cleaned || undefined
}

/**
 * Get all stored API keys from localStorage
 */
export function getApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Failed to load API keys:', error)
    return {}
  }
}

/**
 * Save API keys to localStorage
 */
export function setApiKeys(keys: ApiKeys): void {
  if (typeof window === 'undefined') return
  
  try {
    // Sanitize keys before saving
    const sanitized: ApiKeys = {
      openai: sanitizeApiKey(keys.openai),
      openrouter: sanitizeApiKey(keys.openrouter),
      firecrawl: sanitizeApiKey(keys.firecrawl),
      zep: sanitizeApiKey(keys.zep),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized))
  } catch (error) {
    console.error('Failed to save API keys:', error)
  }
}

/**
 * Update specific API key
 */
export function updateApiKey(provider: keyof ApiKeys, key: string): void {
  const keys = getApiKeys()
  keys[provider] = key
  setApiKeys(keys)
}

/**
 * Remove specific API key
 */
export function removeApiKey(provider: keyof ApiKeys): void {
  const keys = getApiKeys()
  delete keys[provider]
  setApiKeys(keys)
}

/**
 * Clear all API keys
 */
export function clearApiKeys(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Check if user has any keys configured
 */
export function hasAnyKeys(): boolean {
  const keys = getApiKeys()
  return !!(keys.openai || keys.firecrawl || keys.zep)
}

/**
 * Check which features are enabled based on available keys
 */
export function getEnabledFeatures(): {
  chat: boolean
  webScraping: boolean
  memory: boolean
} {
  const keys = getApiKeys()
  return {
    chat: !!keys.openai,
    webScraping: !!keys.firecrawl,
    memory: !!keys.zep
  }
}
