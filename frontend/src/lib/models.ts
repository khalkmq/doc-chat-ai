/**
 * Model management for OpenAI and OpenRouter
 */

export interface Model {
  id: string
  name: string
  provider: string
  context_length?: number
  pricing?: {
    prompt: number
    completion: number
  }
}

// OpenAI Models (GPT-5 Series + Legacy)
export const OPENAI_MODELS: Model[] = [
  { id: 'gpt-5.2', name: 'GPT-5.2 (Direct)', provider: 'OpenAI Direct', context_length: 200000 },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini (Direct)', provider: 'OpenAI Direct', context_length: 200000 },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano (Direct)', provider: 'OpenAI Direct', context_length: 128000 },
  { id: 'gpt-4.1', name: 'GPT-4.1 (Direct)', provider: 'OpenAI Direct', context_length: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Direct)', provider: 'OpenAI Direct', context_length: 128000 },
]

// OpenRouter Models (popular ones for RAG)
export const OPENROUTER_MODELS: Model[] = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI via OpenRouter', context_length: 128000 },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic via OpenRouter', context_length: 200000 },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic via OpenRouter', context_length: 200000 },
  { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro', provider: 'Google via OpenRouter', context_length: 2000000 },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', provider: 'Google via OpenRouter', context_length: 1000000 },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta via OpenRouter', context_length: 131072 },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta via OpenRouter', context_length: 131072 },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral AI via OpenRouter', context_length: 128000 },
  { id: 'cohere/command-r-plus', name: 'Command R+', provider: 'Cohere via OpenRouter', context_length: 128000 },
]

/**
 * Get available models based on which API key is configured
 */
export function getAvailableModels(keys: { openai?: string; openrouter?: string }): Model[] {
  const models: Model[] = []
  
  // Add OpenAI models if key is configured
  if (keys.openai) {
    models.push(...OPENAI_MODELS)
  }
  
  // Add OpenRouter models if key is configured
  if (keys.openrouter) {
    models.push(...OPENROUTER_MODELS)
  }
  
  return models
}

/**
 * Get or set the selected model from localStorage
 */
const MODEL_STORAGE_KEY = 'docchat_selected_model'

export function getSelectedModel(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(MODEL_STORAGE_KEY)
}

export function setSelectedModel(modelId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MODEL_STORAGE_KEY, modelId)
}

/**
 * Get default model based on available keys
 */
export function getDefaultModel(keys: { openai?: string; openrouter?: string }): string {
  if (keys.openrouter) {
    return 'openai/gpt-4o-mini' // Default for OpenRouter (GPT-5 not available yet)
  } else if (keys.openai) {
    return 'gpt-5-mini' // Default for OpenAI Direct
  }
  return 'gpt-5-mini'
}
