'use client'

import { useState } from 'react'
import { Mic } from 'lucide-react'
import { generatePodcast } from '@/lib/api'

interface StudioTabProps {
  sessionId: string
  sources: any[]
}

export default function StudioTab({ sessionId, sources }: StudioTabProps) {
  const [selectedSource, setSelectedSource] = useState('')
  const [style, setStyle] = useState('Conversational')
  const [duration, setDuration] = useState('10 minutes')
  const [isGenerating, setIsGenerating] = useState(false)
  const [script, setScript] = useState<any>(null)

  const handleGenerate = async () => {
    if (!selectedSource) return

    setIsGenerating(true)
    try {
      const result = await generatePodcast(sessionId, selectedSource, style, duration)
      setScript(result.script)
    } catch (error: any) {
      console.error('Podcast generation failed:', error)
      alert(error.response?.data?.detail || 'Failed to generate podcast')
    } finally {
      setIsGenerating(false)
    }
  }

  if (sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <p className="text-lg text-muted-foreground mb-2">No sources available</p>
          <p className="text-sm text-muted-foreground">Add sources to generate podcasts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">🎙️ Generate Podcast</h2>
      <p className="text-muted-foreground mb-6">
        Create an AI-generated podcast discussion from your documents
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Source</label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full px-4 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a source...</option>
            {sources.map((source, idx) => (
              <option key={idx} value={source.name}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-4 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>Conversational</option>
              <option>Interview</option>
              <option>Debate</option>
              <option>Educational</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>5 minutes</option>
              <option>10 minutes</option>
              <option>15 minutes</option>
              <option>20 minutes</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!selectedSource || isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Mic className="w-5 h-5" />
          {isGenerating ? 'Generating...' : 'Generate Podcast'}
        </button>
      </div>

      {script && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Generated Script</h3>
          <div className="bg-secondary rounded-lg p-6 space-y-4">
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(script, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
