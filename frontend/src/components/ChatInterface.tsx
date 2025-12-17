'use client'

import { useState, useEffect, useRef, JSX } from 'react'
import { Send, Trash2, ChevronDown } from 'lucide-react'
import { sendChatMessage, getChatHistory, clearChatHistory, getAllowedModels, type ChatMessage } from '@/lib/api'
import { getApiKeys } from '@/lib/apiKeys'
import { getAvailableModels, getSelectedModel, setSelectedModel, getDefaultModel } from '@/lib/models'

interface ChatInterfaceProps {
  sessionId: string
  sources: any[]
}

// Component to render message with interactive citations
function MessageWithCitations({ content, sources }: { content: string; sources?: any[] }) {
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null)
  
  if (!sources || sources.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>
  }

  // Parse content and replace [1], [2], etc. with interactive spans
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  const citationRegex = /\[(\d+)\]/g
  let match
  let citationInstanceCount = 0

  while ((match = citationRegex.exec(content)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }

    const citationNum = parseInt(match[1])
    const source = sources.find(s => s.reference === `[${citationNum}]`)
    const uniqueId = `citation-${citationNum}-${citationInstanceCount++}`

    if (source) {
      const isClickable = source.url && (source.source_type === 'web' || source.source_type === 'url')
      const handleClick = () => {
        if (isClickable) {
          window.open(source.url, '_blank', 'noopener,noreferrer')
        }
      }

      parts.push(
        <span
          key={uniqueId}
          className="relative inline-block"
          onMouseEnter={() => setHoveredCitation(uniqueId)}
          onMouseLeave={() => setHoveredCitation(null)}
        >
          <span 
            className={`text-primary font-semibold underline decoration-dotted cursor-pointer ${
              isClickable ? 'hover:text-primary/80' : ''
            }`}
            onClick={handleClick}
          >
            [{citationNum}]
          </span>
          {hoveredCitation === uniqueId && (
            <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border text-xs">
              <div className="font-semibold mb-1">{source.source_file}</div>
              <div className="text-muted-foreground">
                Type: {source.source_type}
                {source.chunk_count && ` • ${source.chunk_count} chunk${source.chunk_count > 1 ? 's' : ''}`}
                {source.page_number && ` • Page ${source.page_number}`}
              </div>
              {isClickable && (
                <div className="mt-2 text-primary text-xs">
                  Click to open link →
                </div>
              )}
            </div>
          )}
        </span>
      )
    } else {
      parts.push(`[${citationNum}]`)
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return <div className="whitespace-pre-wrap">{parts}</div>
}

export default function ChatInterface({ sessionId, sources }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Model selection with server-side restrictions
  const keys = getApiKeys()
  const [allowedModelsData, setAllowedModelsData] = useState<{ openai: string[] | null; openrouter: string[] | null } | null>(null)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  
  // Fetch allowed models from server on mount
  useEffect(() => {
    getAllowedModels()
      .then(data => {
        setAllowedModelsData(data.allowed_models)
        setIsLoadingModels(false)
      })
      .catch(err => {
        console.error('Failed to fetch allowed models:', err)
        setIsLoadingModels(false)
      })
  }, [])
  
  const availableModels = getAvailableModels(
    // If no user keys, use dummy keys to show server models
    keys.openai || keys.openrouter ? keys : { openai: 'server', openrouter: 'server' },
    allowedModelsData || undefined
  )
  
  const [selectedModel, setSelectedModelState] = useState<string>(
    getSelectedModel() || getDefaultModel(keys.openai || keys.openrouter ? keys : { openai: 'server', openrouter: 'server' })
  )
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  const handleModelChange = (modelId: string) => {
    setSelectedModelState(modelId)
    setSelectedModel(modelId)
    setShowModelDropdown(false)
  }

  useEffect(() => {
    // Load chat history
    getChatHistory(sessionId).then(data => {
      setMessages(data.chat_history)
    }).catch(err => console.error('Failed to load chat:', err))
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const streamText = (text: string, sources?: any[]) => {
    setIsStreaming(true)
    setStreamingMessage('')
    
    const words = text.split(' ')
    let index = 0
    const delay = 20 // ms between words
    
    const interval = setInterval(() => {
      if (index < words.length) {
        const currentText = words.slice(0, index + 1).join(' ')
        setStreamingMessage(currentText)
        index++
      } else {
        clearInterval(interval)
        setIsStreaming(false)
        setStreamingMessage('')
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: text,
          sources: sources
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    }, delay)
  }

  const handleSend = async () => {
    if (!input.trim() || isSending) return

    const userMessage: ChatMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const messageToSend = input
    setInput('')
    
    // Keep focus on input immediately after clearing
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    
    setIsSending(true)

    try {
      const useConversationHistory = localStorage.getItem('chatMemory') !== 'false' // default to true
      const response = await sendChatMessage(sessionId, messageToSend, selectedModel, useConversationHistory)
      streamText(response.response, response.sources)
    } catch (error: any) {
      console.error('Chat error:', error)
      const errorText = error.response?.data?.detail || 'Sorry, I encountered an error. Please try again.'
      streamText(errorText)
    } finally {
      setIsSending(false)
    }
  }

  const handleClear = async () => {
    try {
      await clearChatHistory(sessionId)
      setMessages([])
    } catch (error) {
      console.error('Clear failed:', error)
    }
  }

  if (sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <p className="text-lg text-muted-foreground mb-2">No sources available</p>
          <p className="text-sm text-muted-foreground">Add sources in the "Add Sources" tab to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-xl font-semibold">Chat</h2>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <MessageWithCitations content={msg.content} sources={msg.sources} />
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20 text-xs opacity-80">
                  <p>Sources: {msg.sources.map(s => s.source_file).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isSending && !isStreaming && (
          <div className="flex justify-start">
              <p className="text-muted-foreground italic flex items-center gap-2 max-w-2xl px-4 py-4">
                <span className="inline-block w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="inline-block w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="inline-block w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </p> 
          </div>
        )}
        
        {isStreaming && streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-2xl px-4 py-3 rounded-lg bg-secondary text-foreground">
              <p className="whitespace-pre-wrap">{streamingMessage}<span className="animate-pulse">▋</span></p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex gap-2 items-stretch">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="h-full px-3 py-2.5 bg-secondary text-foreground rounded-md border border-border hover:bg-secondary/80 transition-colors flex items-center gap-2 min-w-[200px] justify-between"
              title="Select AI Model"
            >
              <span className="text-sm truncate">
                {availableModels.find(m => m.id === selectedModel)?.name || 'Select Model'}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
            
            {showModelDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-popover border border-border rounded-lg shadow-lg max-h-96 overflow-auto z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                    Available Models ({availableModels.length})
                  </div>
                  {availableModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={`w-full text-left px-3 py-2 rounded-md hover:bg-secondary transition-colors ${
                        selectedModel === model.id ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.provider}
                        {model.context_length && ` • ${(model.context_length / 1000).toFixed(0)}K context`}
                      </div>
                      {model.pricing && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {model.pricing.prompt === 0 && model.pricing.completion === 0 ? (
                            <span className="text-green-500 font-semibold">FREE</span>
                          ) : (
                            <>
                              <div>${model.pricing.prompt.toFixed(2)}/M input tokens</div>
                              <div>${model.pricing.completion.toFixed(2)}/M output tokens</div>
                            </>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                  {availableModels.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No models available. Please configure an API key in Settings.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSend()}
            placeholder="Ask me anything about your sources..."
            className="flex-1 px-4 py-2.5 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"

          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
