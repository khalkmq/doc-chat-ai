'use client'

import { Brain, Key, FileText, MessageSquare, Sparkles, Github } from 'lucide-react'

interface WelcomeScreenProps {
  onConfigure: () => void
  onStartLimited: () => void
}

export default function WelcomeScreen({ onConfigure, onStartLimited }: WelcomeScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Brain className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to DocChat
          </h1>
          <p className="text-xl text-muted-foreground">
            Your intelligent document companion powered by AI
          </p>
        </div>

        {/* Features */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 bg-card border border-border rounded-lg space-y-2">
            <FileText className="w-8 h-8 text-primary" />
            <h3 className="font-semibold">Multi-Format Support</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDFs, documents, or scrape web content with ease
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-lg space-y-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            <h3 className="font-semibold">Intelligent Conversations</h3>
            <p className="text-sm text-muted-foreground">
              Ask questions and get answers with source citations
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-lg space-y-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h3 className="font-semibold">Memory & Context</h3>
            <p className="text-sm text-muted-foreground">
              Persistent sessions remember your conversations and documents
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-lg space-y-2">
            <Key className="w-8 h-8 text-primary" />
            <h3 className="font-semibold">Multi-Provider AI</h3>
            <p className="text-sm text-muted-foreground">
              Choose from OpenAI or OpenRouter
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Ready to go!</strong> Optionally add your own keys for full model access.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onStartLimited}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start with Limited Usage
            </button>

            <button
              onClick={onConfigure}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg inline-flex items-center gap-2"
            >
              <Key className="w-5 h-5" />
              Configure API Keys (Optional)
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Server keys available: Budget models included. Add your own keys for unrestricted access.
          </p>

          <a
            href="https://github.com/khalkmq/doc-chat-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-4"
          >
            <Github className="w-4 h-4" />
            Learn more about this project
          </a>
        </div>
      </div>
    </div>
  )
}
