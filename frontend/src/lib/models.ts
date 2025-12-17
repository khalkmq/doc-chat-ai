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

// OpenAI Models (curated for RAG/document chat) (GPT-5 Series + Legacy)
export const OPENAI_MODELS: Model[] = [
  { id: 'gpt-5.2', name: 'GPT-5.2 (Direct)', provider: 'OpenAI Direct', context_length: 200000, pricing: { prompt: 1.75, completion: 14 } },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini (Direct)', provider: 'OpenAI Direct', context_length: 200000, pricing: { prompt: 0.25, completion: 2 } },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano (Direct)', provider: 'OpenAI Direct', context_length: 128000, pricing: { prompt: 0.10, completion: 0.80 } },
  { id: 'gpt-4.1', name: 'GPT-4.1 (Direct)', provider: 'OpenAI Direct', context_length: 128000, pricing: { prompt: 3, completion: 12 } },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Direct)', provider: 'OpenAI Direct', context_length: 128000, pricing: { prompt: 0.15, completion: 0.60 } },
]

// OpenRouter Models (curated for RAG/document chat)
export const OPENROUTER_MODELS: Model[] = [
  // GPT-5 Series via OpenRouter (Best Performance)
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI via OpenRouter', context_length: 400000, pricing: { prompt: 1.75, completion: 14 } },
  { id: 'openai/gpt-5.2-chat', name: 'GPT-5.2 Chat (Fast)', provider: 'OpenAI via OpenRouter', context_length: 128000, pricing: { prompt: 1.75, completion: 14 } },
  
  // Budget Options (GPT-4 Era)
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI via OpenRouter', context_length: 128000, pricing: { prompt: 0.15, completion: 0.60 } },

  // Anthropic Claude 4.5 Series (Latest - Frontier Models)
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic via OpenRouter', context_length: 1000000, pricing: { prompt: 3, completion: 15 } },
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5 (Premium)', provider: 'Anthropic via OpenRouter', context_length: 200000, pricing: { prompt: 5, completion: 25 } },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5 (Fast)', provider: 'Anthropic via OpenRouter', context_length: 200000, pricing: { prompt: 1, completion: 5 } },
  
  // Google Gemini 2.x/3.x (Latest - Massive Context + Reasoning)
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', provider: 'Google via OpenRouter', context_length: 1050000, pricing: { prompt: 2, completion: 12 } },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google via OpenRouter', context_length: 1050000, pricing: { prompt: 1.25, completion: 10 } },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)', provider: 'Google via OpenRouter', context_length: 1050000, pricing: { prompt: 0.30, completion: 2.50 } },

  // DeepSeek (Ultra Budget - Strong Reasoning)
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek via OpenRouter', context_length: 164000, pricing: { prompt: 0.24, completion: 0.38 } },

  // Qwen (Alibaba - Strong Performance)
  { id: 'qwen/qwen3-235b-a22b-2507', name: 'Qwen3 235B (MoE)', provider: 'Alibaba via OpenRouter', context_length: 262000, pricing: { prompt: 0.071, completion: 0.463 } },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', provider: 'Alibaba via OpenRouter', context_length: 41000, pricing: { prompt: 0.08, completion: 0.24 } },

  // Free Models (Budget Friendly)
  { id: 'xiaomi/mimo-v2-flash:free', name: 'MiMo V2 Flash (Free)', provider: 'Xiaomi via OpenRouter', context_length: 262000, pricing: { prompt: 0, completion: 0 } },
  
  // Open Source Options
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta via OpenRouter', context_length: 131072, pricing: { prompt: 0.35, completion: 0.40 } },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral AI via OpenRouter', context_length: 128000, pricing: { prompt: 2, completion: 6 } },
]

/**
 * Get available models based on which API key is configured
 * and what restrictions apply (server vs user keys)
 */
export function getAvailableModels(
  keys: { openai?: string; openrouter?: string },
  allowedModels?: { openai: string[] | null; openrouter: string[] | null }
): Model[] {
  const models: Model[] = []
  
  // Add OpenAI models if key is configured
  if (keys.openai) {
    const openaiModels = allowedModels?.openai 
      ? OPENAI_MODELS.filter(m => allowedModels.openai!.includes(m.id))
      : OPENAI_MODELS
    models.push(...openaiModels)
  }
  
  // Add OpenRouter models if key is configured
  if (keys.openrouter) {
    const openrouterModels = allowedModels?.openrouter
      ? OPENROUTER_MODELS.filter(m => allowedModels.openrouter!.includes(m.id))
      : OPENROUTER_MODELS
    models.push(...openrouterModels)
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
    return 'openai/gpt-4o-mini' // Budget-friendly default for OpenRouter
  } else if (keys.openai) {
    return 'gpt-5-mini' // Default for OpenAI Direct
  }
  return 'gpt-5-mini'
}
