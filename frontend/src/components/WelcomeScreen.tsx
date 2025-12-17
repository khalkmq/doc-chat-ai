'use client'

import { Brain, Key, FileText, MessageSquare, Sparkles, Github } from 'lucide-react'

interface WelcomeScreenProps {
  onConfigure: () => void
}

export default function WelcomeScreen({ onConfigure }: WelcomeScreenProps) {
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
            <h3 className="font-semibold">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              Your API keys stay in your browser, never stored on our servers
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-200">
              To get started, you'll need to configure your API keys
            </p>
          </div>

          <button
            onClick={onConfigure}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg inline-flex items-center gap-2"
          >
            <Key className="w-5 h-5" />
            Configure API Keys
          </button>

          <p className="text-xs text-muted-foreground">
            Required: OpenAI or OpenRouter, and Firecrawl API keys
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
