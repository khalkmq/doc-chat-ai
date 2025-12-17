import axios from 'axios'
import { getApiKeys } from './apiKeys'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Sanitize API key - remove non-ASCII characters
function sanitizeHeaderValue(value: string | undefined): string | undefined {
  if (!value) return undefined
  // Remove non-ASCII characters and trim
  return value.trim().replace(/[^\x00-\x7F]/g, '')
}

// Add API keys to all requests
api.interceptors.request.use((config) => {
  const keys = getApiKeys()
  const sanitizedOpenAI = sanitizeHeaderValue(keys.openai)
  const sanitizedOpenRouter = sanitizeHeaderValue(keys.openrouter)
  const sanitizedFirecrawl = sanitizeHeaderValue(keys.firecrawl)
  
  if (sanitizedOpenAI) {
    config.headers['X-OpenAI-Key'] = sanitizedOpenAI
  }
  if (sanitizedOpenRouter) {
    config.headers['X-OpenRouter-Key'] = sanitizedOpenRouter
  }
  if (sanitizedFirecrawl) {
    config.headers['X-Firecrawl-Key'] = sanitizedFirecrawl
  }
  return config
})

export interface SessionResponse {
  session_id: string
  features: {
    chat_enabled: boolean
    web_scraping_enabled: boolean
    podcast_enabled: boolean
    memory_enabled: boolean
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
}

export interface Source {
  name: string
  type: string
  size: string
  chunks: number
  uploaded_at: string
  url?: string
}

export async function createSession(): Promise<SessionResponse> {
  const response = await api.post('/session')
  return response.data
}

export async function verifySession(sessionId: string): Promise<{ valid: boolean; session_id?: string; sources_count?: number; features?: any; message?: string }> {
  try {
    const response = await api.post('/session/verify', {}, {
      headers: {
        'X-Session-Id': sessionId,
      },
    })
    return response.data
  } catch (error) {
    return { valid: false, message: 'Session verification failed' }
  }
}

export async function uploadFile(sessionId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await api.post('/upload', formData, {
    headers: {
      'X-Session-Id': sessionId,
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export async function uploadText(sessionId: string, text: string, title: string = 'Raw Text') {
  const response = await api.post(
    '/upload/text',
    { text, title },
    {
      headers: {
        'X-Session-Id': sessionId,
      },
    }
  )
  return response.data
}

export async function uploadURLs(sessionId: string, urls: string[]) {
  const response = await api.post(
    '/upload/url',
    { urls },
    {
      headers: {
        'X-Session-Id': sessionId,
      },
    }
  )
  return response.data
}

export async function sendChatMessage(sessionId: string, query: string, model?: string, useConversationHistory: boolean = true) {
  const response = await api.post(
    '/chat',
    { query, model, use_conversation_history: useConversationHistory },
    {
      headers: {
        'X-Session-Id': sessionId,
      },
    }
  )
  return response.data
}

export async function getChatHistory(sessionId: string) {
  const response = await api.get('/chat/history', {
    headers: {
      'X-Session-Id': sessionId,
    },
  })
  return response.data
}

export async function clearChatHistory(sessionId: string) {
  const response = await api.delete('/chat/history', {
    headers: {
      'X-Session-Id': sessionId,
    },
  })
  return response.data
}

export async function getSources(sessionId: string) {
  const response = await api.get('/sources', {
    headers: {
      'X-Session-Id': sessionId,
    },
  })
  return response.data
}

export async function deleteSource(sessionId: string, index: number) {
  const response = await api.delete(`/sources/${index}`, {
    headers: {
      'X-Session-Id': sessionId,
    },
  })
  return response.data
}

export async function generatePodcast(
  sessionId: string,
  sourceName: string,
  style: string = 'Conversational',
  duration: string = '10 minutes'
) {
  const response = await api.post(
    '/podcast/generate',
    { source_name: sourceName, style, duration },
    {
      headers: {
        'X-Session-Id': sessionId,
      },
    }
  )
  return response.data
}

export interface AllowedModelsResponse {
  key_sources: {
    openai: 'user' | 'server'
    openrouter: 'user' | 'server'
    firecrawl: 'user' | 'server'
  }
  allowed_models: {
    openai: string[] | null  // null = all allowed
    openrouter: string[] | null  // null = all allowed
  }
  has_restrictions: boolean
}

export async function getAllowedModels(): Promise<AllowedModelsResponse> {
  const response = await api.get('/models')
  return response.data
}

export default api
