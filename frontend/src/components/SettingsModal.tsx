'use client'

import { useState } from 'react'
import { Settings, Eye, EyeOff, X } from 'lucide-react'
import { getApiKeys, setApiKeys, type ApiKeys } from '@/lib/apiKeys'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [keys, setKeys] = useState<ApiKeys>(getApiKeys())
  const [showKeys, setShowKeys] = useState({
    openai: false,
    openrouter: false,
    firecrawl: false
  })
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    setIsSaving(true)
    setApiKeys(keys)
    setTimeout(() => {
      setIsSaving(false)
      onSave?.()
      onClose()
    }, 500)
  }

  const handleInputChange = (provider: keyof ApiKeys, value: string) => {
    setKeys({ ...keys, [provider]: value })
  }

  const toggleShowKey = (provider: keyof typeof showKeys) => {
    setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">API Keys Configuration</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
              title="Close"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Your API keys are stored locally in your browser and sent with each request. 
            If no keys are provided, server keys will be used (with limited model access).
          </p>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-200">
              <strong>Optional:</strong> Provide your own API keys for full model access, or leave empty to use server keys with budget models only.
            </p>
          </div>

          {/* OpenAI Key */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                OpenAI API Key <span className="text-muted-foreground text-xs">(Optional - leave empty to use server key)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys.openai ? 'text' : 'password'}
                  value={keys.openai || ''}
                  onChange={(e) => handleInputChange('openai', e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <button
                  onClick={() => toggleShowKey('openai')}
                  className="px-3 py-2 border border-border rounded-md hover:bg-secondary transition-colors"
                  title={showKeys.openai ? 'Hide' : 'Show'}
                >
                  {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                For chat and document processing. Get your key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  platform.openai.com
                </a>
              </p>
            </div>

            {/* OpenRouter Key */}
            <div>
              <label className="block text-sm font-medium mb-2">
                OpenRouter API Key <span className="text-muted-foreground text-xs">(Optional - leave empty to use server key)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys.openrouter ? 'text' : 'password'}
                  value={keys.openrouter || ''}
                  onChange={(e) => handleInputChange('openrouter', e.target.value)}
                  placeholder="sk-or-..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <button
                  onClick={() => toggleShowKey('openrouter')}
                  className="px-3 py-2 border border-border rounded-md hover:bg-secondary transition-colors"
                  title={showKeys.openrouter ? 'Hide' : 'Show'}
                >
                  {showKeys.openrouter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                For chat and document processing, access to most models (GPT-4, Claude, Gemini, Llama, etc.). Get your key from{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  openrouter.ai
                </a>
              </p>
            </div>

            {/* Firecrawl Key */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Firecrawl API Key <span className="text-muted-foreground text-xs">(Optional - leave empty to use server key)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys.firecrawl ? 'text' : 'password'}
                  value={keys.firecrawl || ''}
                  onChange={(e) => handleInputChange('firecrawl', e.target.value)}
                  placeholder="fc-..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <button
                  onClick={() => toggleShowKey('firecrawl')}
                  className="px-3 py-2 border border-border rounded-md hover:bg-secondary transition-colors"
                  title={showKeys.firecrawl ? 'Hide' : 'Show'}
                >
                  {showKeys.firecrawl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Required for web scraping. Get your key from{' '}
                <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  firecrawl.dev
                </a>
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              <strong>Security Notice:</strong> Your API keys are stored in your browser's localStorage. 
              Only use this application on trusted devices.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (!keys.openai && !keys.openrouter)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
