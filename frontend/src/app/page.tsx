'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import SourcesSidebar from '@/components/SourcesSidebar'
import UploadDialog from '@/components/UploadDialog'
import SettingsModal from '@/components/SettingsModal'
import { Brain, Settings } from 'lucide-react'
import { createSession, verifySession } from '@/lib/api'
import { hasAnyKeys } from '@/lib/apiKeys'

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sources, setSources] = useState<any[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showNewSessionModal, setShowNewSessionModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [manualSessionId, setManualSessionId] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(256) // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    // Check if user has API keys configured
    if (!hasAnyKeys()) {
      setShowSettingsModal(true)
      return
    }

    const initSession = async () => {
      const storedSessionId = localStorage.getItem('docchat_session_id')
      
      // Try to restore existing session
      if (storedSessionId) {
        console.log('Checking stored session:', storedSessionId)
        const result = await verifySession(storedSessionId)
        
        if (result.valid) {
          setSessionId(storedSessionId)
          console.log('Restored existing session:', storedSessionId, 'with', result.sources_count, 'sources')
          return
        } else {
          console.log('Stored session could not be restored:', result.message)
          localStorage.removeItem('docchat_session_id')
        }
      }
      
      // Create new session if no valid stored session
      try {
        const data = await createSession()
        setSessionId(data.session_id)
        localStorage.setItem('docchat_session_id', data.session_id)
        console.log('New session created:', data.session_id)
        console.log('Features enabled:', data.features)
      } catch (err) {
        console.error('Failed to create session:', err)
        setShowSettingsModal(true)
      }
    }

    initSession()
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleManualSessionEntry = () => {
    if (manualSessionId.trim()) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(manualSessionId.trim())) {
        localStorage.setItem('docchat_session_id', manualSessionId.trim())
        setSessionId(manualSessionId.trim())
        setShowSessionModal(false)
        setManualSessionId('')
        window.location.reload()
      } else {
        alert('Invalid session ID format. Please enter a valid UUID.')
      }
    }
  }

  const handleNewSession = () => {
    localStorage.removeItem('docchat_session_id')
    setShowNewSessionModal(false)   
    window.location.reload()
  }

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      alert('Session ID copied to clipboard!')
    }
  }

  if (!sessionId) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
            <p className="text-muted-foreground">Initializing DocChat...</p>
          </div>
        </div>
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSave={() => {
            // Reload to create session with new keys
            window.location.reload()
          }}
        />
      </>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <SourcesSidebar 
        sessionId={sessionId} 
        sources={sources}
        onSourcesChange={setSources}
        onAddSource={() => setShowUploadModal(true)}
        width={sidebarWidth}
      />
      
      {/* Resize Handle */}
      <div
        className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute inset-0 w-3 -left-1 group-hover:bg-primary/10" />
      </div>

      <main className="flex-1 flex flex-col">
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">DocChat: Chat with Your Documents</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-secondary transition-colors flex items-center gap-2"
                title="API Keys Settings"
              >
                <Settings className="w-4 h-4" />
                API Settings
              </button>
              <button
                onClick={() => setShowSessionModal(true)}
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-secondary transition-colors"
                title="Manage session"
              >
                Session
              </button>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-secondary transition-colors"
                title="Start new session"
              >
                New Session
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto relative">
          <ChatInterface 
            sessionId={sessionId} 
            sources={sources}
          />
          
          {showUploadModal && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto m-4">
                <UploadDialog 
                  sessionId={sessionId} 
                  onSourceAdded={(source) => {
                    setSources([...sources, source])
                    setShowUploadModal(false)
                  }}
                  onClose={() => setShowUploadModal(false)}
                />
              </div>
            </div>
          )}
          
          {showSessionModal && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full m-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Session Management</h2>
                    <button
                      onClick={() => setShowSessionModal(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Your Session ID:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={sessionId || ''}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-secondary font-mono"
                        />
                        <button
                          onClick={copySessionId}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Save this ID to restore your session later
                      </p>
                    </div>
                    
                    <div className="border-t border-border pt-4">
                      <label className="text-sm font-medium block mb-2">Restore Session:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualSessionId}
                          onChange={(e) => setManualSessionId(e.target.value)}
                          placeholder="Paste session ID here..."
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background font-mono"
                        />
                        <button
                          onClick={handleManualSessionEntry}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                        >
                          Restore
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter a previous session ID to access your old data
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {showNewSessionModal && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full m-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Start New Session</h2>
                    <button
                      onClick={() => setShowNewSessionModal(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    Are you sure you want to start a new session? Your current session ID is saved and you can restore it later using the Session button.
                  </p>
                  
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowNewSessionModal(false)}
                      className="px-4 py-2 border border-border rounded-md hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleNewSession}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Start New Session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            onSave={() => {
              // Reload to create session with new keys
              window.location.reload()
            }}
          />
          
          {sources.length === 0 && !showUploadModal && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-card border-2 border-primary/50 rounded-lg shadow-2xl p-8 text-center max-w-md pointer-events-auto">
                <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-bold mb-2">Welcome to DocChat</h2>
                <p className="text-muted-foreground mb-6">
                  Get started by adding your first document, website, or text to chat with.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  Add Your First Source
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-border px-6 py-3 text-center text-sm text-muted-foreground">
          DocChat is an LLM-powered tool that assists with document-based queries. While it strives for accuracy, please verify critical information independently.
        </footer>
      </main>
    </div>
  )
}
