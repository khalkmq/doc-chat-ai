'use client'

import { useState } from 'react'
import { Upload, Link, FileText, AlertCircle } from 'lucide-react'
import { uploadFile, uploadText, uploadURLs } from '@/lib/api'
import { getEnabledFeatures } from '@/lib/apiKeys'

interface UploadDialogProps {
  sessionId: string
  onSourceAdded: (source: any) => void
  onClose?: () => void
}

export default function UploadDialog({ sessionId, onSourceAdded, onClose }: UploadDialogProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'text'>('file')
  const [isUploading, setIsUploading] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [urlsText, setUrlsText] = useState('')
  
  const features = getEnabledFeatures()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const result = await uploadFile(sessionId, file)
        onSourceAdded(result.source_info)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Check console for details.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleTextUpload = async () => {
    if (!textContent.trim()) return

    setIsUploading(true)
    try {
      const result = await uploadText(sessionId, textContent)
      onSourceAdded(result.source_info)
      setTextContent('')
    } catch (error) {
      console.error('Text upload failed:', error)
      alert('Upload failed. Check console for details.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleURLUpload = async () => {
    const urls = urlsText.split('\n').filter(u => u.trim())
    if (urls.length === 0) return

    setIsUploading(true)
    try {
      const result = await uploadURLs(sessionId, urls)
      result.results.forEach((r: any) => {
        if (r.status === 'success') {
          onSourceAdded({ name: r.url, type: 'Website', chunks: r.chunks })
        }
      })
      setUrlsText('')
    } catch (error) {
      console.error('URL upload failed:', error)
      alert('Upload failed. Check console for details.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">📁 Add sources</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
            title="Close"
          >
            ×
          </button>
        )}
      </div>
      <p className="text-muted-foreground mb-6">
        Sources let DocChat base its responses on the information that matters most to you.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {[
          { key: 'file', label: 'Upload Files', icon: Upload, enabled: features.chat },
          { key: 'url', label: 'Website', icon: Link, enabled: features.webScraping },
          { key: 'text', label: 'Raw Text', icon: FileText, enabled: features.chat }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => tab.enabled && setActiveTab(tab.key as any)}
              disabled={!tab.enabled}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : tab.enabled
                  ? 'border-transparent text-muted-foreground hover:text-foreground'
                  : 'border-transparent text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {!tab.enabled && <span className="text-xs">(Key Required)</span>}
            </button>
          )
        })}
      </div>
      
      {!features.chat && !features.webScraping && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            <strong>API Keys Required:</strong> Please configure your OpenAI API key in Settings to upload files and text, 
            or your Firecrawl API key to scrape websites.
          </p>
        </div>
      )}

      {/* File Upload */}
      {activeTab === 'file' && (
        <div>
          <label className="block">
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                disabled:opacity-50"
            />
          </label>
          <p className="mt-2 text-sm text-muted-foreground">
            Supported: PDF, .txt, Markdown
          </p>
        </div>
      )}

      {/* URL Upload */}
      {activeTab === 'url' && (
        <div>
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder="https://example.com&#10;https://another-site.com"
            className="w-full h-32 px-4 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isUploading}
          />
          <button
            onClick={handleURLUpload}
            disabled={isUploading || !urlsText.trim()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isUploading ? 'Processing...' : 'Process URLs'}
          </button>
        </div>
      )}

      {/* Text Upload */}
      {activeTab === 'text' && (
        <div>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Paste your text here..."
            className="w-full h-48 px-4 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isUploading}
          />
          <button
            onClick={handleTextUpload}
            disabled={isUploading || !textContent.trim()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isUploading ? 'Processing...' : 'Process Text'}
          </button>
        </div>
      )}
    </div>
  )
}
