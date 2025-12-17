'use client'

import { useState, useEffect } from 'react'
import { FileText, Trash2, Plus, Info } from 'lucide-react'
import { getSources, deleteSource } from '@/lib/api'

interface SourcesSidebarProps {
  sessionId: string
  sources: any[]
  onSourcesChange: (sources: any[]) => void
  onAddSource: () => void
  width?: number
}

export default function SourcesSidebar({ sessionId, sources, onSourcesChange, onAddSource, width = 256 }: SourcesSidebarProps) {
  const [chatMemory, setChatMemory] = useState(true)
  
  useEffect(() => {
    // Load chat memory preference from localStorage
    const saved = localStorage.getItem('chatMemory')
    if (saved !== null) {
      setChatMemory(saved === 'true')
    }
  }, [])
  
  const handleChatMemoryToggle = (checked: boolean) => {
    setChatMemory(checked)
    localStorage.setItem('chatMemory', String(checked))
  }
  
  useEffect(() => {
    // Fetch sources on mount
    getSources(sessionId).then(data => {
      onSourcesChange(data.sources)
    }).catch(err => console.error('Failed to fetch sources:', err))
  }, [sessionId])

  const handleDelete = async (index: number) => {
    try {
      await deleteSource(sessionId, index)
      const updated = sources.filter((_, i) => i !== index)
      onSourcesChange(updated)
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  return (
    <aside className="border-r border-border bg-card p-4" style={{ width: `${width}px`, minWidth: '200px', maxWidth: '600px' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sources</h2>
        <button
          onClick={onAddSource}
          className="p-2 hover:bg-secondary rounded-md transition-colors"
          title="Add source"
        >
          <Plus className="w-5 h-5 text-primary" />
        </button>
      </div>
      
      {/* Chat Memory Toggle */}
      <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-start gap-2 mb-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={chatMemory}
              onChange={(e) => handleChatMemoryToggle(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer"
            />
            <span className="font-medium">Chat Memory</span>
          </label>
          <div className="relative group">
            <Info className="w-4 h-4 text-muted-foreground cursor-pointer flex-shrink-0" />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              <div className="font-semibold mb-1">Chat Memory</div>
              <div className="text-muted-foreground space-y-2">
                <div><strong>ON:</strong> The AI remembers previous messages and can answer follow-up questions.</div>
                <div><strong>OFF:</strong> Pure research mode - only uses uploaded documents with strict citations.</div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {chatMemory 
            ? 'AI can reference previous conversation turns'
            : 'AI only uses information from documents below'}
        </p>
      </div>
      
      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sources added yet</p>
      ) : (
        <div className="space-y-2">
          {sources.map((source, index) => (
            <div
              key={index}
              className="p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
                    <p className="text-sm font-medium truncate">{source.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {source.chunks} chunks • {source.size}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                  title="Delete source"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
