'use client'

import { useState, useEffect } from 'react'
import { FileText, Trash2, Plus } from 'lucide-react'
import { getSources, deleteSource } from '@/lib/api'

interface SourcesSidebarProps {
  sessionId: string
  sources: any[]
  onSourcesChange: (sources: any[]) => void
  onAddSource: () => void
  width?: number
}

export default function SourcesSidebar({ sessionId, sources, onSourcesChange, onAddSource, width = 256 }: SourcesSidebarProps) {
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
