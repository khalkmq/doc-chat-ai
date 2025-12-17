'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import SourcesSidebar from '@/components/SourcesSidebar'
import UploadDialog from '@/components/UploadDialog'
import SettingsModal from '@/components/SettingsModal'
import WelcomeScreen from '@/components/WelcomeScreen'
import { Brain, Settings } from 'lucide-react'
import { createSession, verifySession } from '@/lib/api'
import { hasAnyKeys } from '@/lib/apiKeys'

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sources, setSources] = useState<any[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasConfiguredKeys, setHasConfiguredKeys] = useState(false)
  const [manualSessionId, setManualSessionId] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(256) // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    const initSession = async () => {
      const storedSessionId = localStorage.getItem('docchat_session_id')
      
      // Try to restore existing session first (regardless of key configuration)
      if (storedSessionId) {
        console.log('Checking stored session:', storedSessionId)
        const result = await verifySession(storedSessionId)
        
        if (result.valid) {
          setSessionId(storedSessionId)
          setHasConfiguredKeys(true) // User has already started
          setShowWelcome(false)
          setIsLoading(false)
          console.log('Restored existing session:', storedSessionId, 'with', result.sources_count, 'sources')
          return
        } else {
          console.log('Stored session could not be restored:', result.message)
          localStorage.removeItem('docchat_session_id')
          // Session invalid - show welcome screen to start fresh
          setHasConfiguredKeys(false)
          setShowWelcome(true)
          setIsLoading(false)
          return
        }
      }
      
      // No valid stored session - check if user has configured keys or chosen limited mode
      if (!hasConfiguredKeys && !hasAnyKeys()) {
        setShowWelcome(true)
        setIsLoading(false)
        return
      }
      
      // User has keys or has chosen to proceed - mark as configured
      if (!hasConfiguredKeys) {
        setHasConfiguredKeys(true)
      }
      setShowWelcome(false)
      
      // Create new session
      try {
        const data = await createSession()
        setSessionId(data.session_id)
        localStorage.setItem('docchat_session_id', data.session_id)
        setIsLoading(false)
        console.log('New session created:', data.session_id)
        console.log('Features enabled:', data.features)
      } catch (err) {
        console.error('Failed to create session:', err)
        setIsLoading(false)
        setShowSettingsModal(true)
      }
    }

    initSession()
  }, [hasConfiguredKeys])

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
    setShowSessionModal(false)   
    window.location.reload()
  }

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      alert('Session ID copied to clipboard!')
    }
  }

  // Show loading screen while checking keys and initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Initializing DocChat...</p>
        </div>
      </div>
    )
  }

  // Show welcome screen if no keys configured
  if (showWelcome || !hasConfiguredKeys) {
    return (
      <>
        <WelcomeScreen 
          onConfigure={() => setShowSettingsModal(true)}
          onStartLimited={() => {
            // User wants to proceed with limited usage using server keys
            setShowWelcome(false)
            setHasConfiguredKeys(true)
            setIsLoading(false)
            // This will trigger the useEffect to create a session
          }}
        />
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            // If they cancel and have no keys, stay on welcome
            if (!hasAnyKeys()) {
              setShowSettingsModal(false)
              setShowWelcome(true)
            } else {
              setShowSettingsModal(false)
            }
          }}
          onSave={() => {
            // Reload to create session with new keys
            window.location.reload()
          }}
        />
      </>
    )
  }

  // Show loading while session initializes (after keys are confirmed)
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Creating session...</p>
        </div>
      </div>
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
              <h1 className="text-2xl font-bold">DocChat - Chat with Your Documents</h1>
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
                Manage Session
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

                    <div className="border-t border-border pt-4">
                      <label className="text-sm font-medium block mb-2">Start New Session:</label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create a fresh session. Your current session is saved and can be restored later using the session ID.
                      </p>
                      <button
                        onClick={handleNewSession}
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                      >
                        Start New Session
                      </button>
                    </div>
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
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <p>
              DocChat is an LLM-powered tool that assists with document-based queries. While it strives for accuracy, please verify critical information independently.
            </p>
            <span className="text-border">•</span>
            <a
              href="https://github.com/khalkmq/doc-chat-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Learn more about this project
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
