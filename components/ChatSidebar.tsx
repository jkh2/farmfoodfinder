'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'

type ChatSidebarProps = {
  userLat: number
  userLng: number
  radiusMiles: number
  isOpen: boolean
  onClose: () => void
}

export default function ChatSidebar({ userLat, userLng, radiusMiles, isOpen, onClose }: ChatSidebarProps) {
  const [provider, setProvider] = useState('default')
  const [apiKey, setApiKey] = useState('')
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Load saved settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fff_ai_settings')
      if (saved) {
        try {
          const { provider: p, apiKey: k } = JSON.parse(saved)
          if (p) setProvider(p)
          if (k) setApiKey(k)
        } catch {}
      }
    }
  }, [])

  function saveSettings() {
    localStorage.setItem('fff_ai_settings', JSON.stringify({ provider, apiKey }))
    setShowSettings(false)
  }

  // Keep current body params accessible in the transport closure without recreating it
  const bodyRef = useRef({ provider, apiKey, userLat, userLng, radiusMiles })
  useEffect(() => {
    bodyRef.current = { provider, apiKey, userLat, userLng, radiusMiles }
  }, [provider, apiKey, userLat, userLng, radiusMiles])

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: (opts) => ({
      body: { messages: opts.messages, id: opts.id, ...bodyRef.current },
    }),
  }), [])

  const { messages, sendMessage, status } = useChat({ transport })
  const isLoading = status === 'submitted' || status === 'streaming'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  function getMessageText(msg: UIMessage): string {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl flex flex-col z-50 border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-green-700 text-white">
        <div>
          <h2 className="font-semibold text-sm">AI Food Guide</h2>
          <p className="text-xs text-green-200">Ask me about local farms & markets</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-green-200 hover:text-white text-lg"
            title="AI Settings"
          >⚙</button>
          <button onClick={onClose} className="text-green-200 hover:text-white text-lg">✕</button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm">
          <p className="font-medium text-gray-700 mb-3">AI Settings</p>
          <div className="mb-3">
            <label className="block text-gray-600 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="default">Default (free)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
            </select>
          </div>
          {provider !== 'default' && (
            <div className="mb-3">
              <label className="block text-gray-600 mb-1">Your API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key..."
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Stored locally only, never shared.</p>
            </div>
          )}
          <button
            onClick={saveSettings}
            className="w-full bg-green-700 text-white rounded py-1.5 text-sm hover:bg-green-800"
          >
            Save
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            <p className="text-2xl mb-2">🌽</p>
            <p className="font-medium text-gray-600">Ask me anything about local food near you.</p>
            <div className="mt-4 space-y-2 text-left">
              {[
                'What farms are near me?',
                "What's in season right now?",
                'Find me a Saturday farmers market',
                'Where can I get local eggs?',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block w-full text-left bg-gray-100 hover:bg-gray-200 rounded px-3 py-2 text-xs text-gray-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {getMessageText(m)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
              <span className="animate-pulse">Searching...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about local food..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-green-700 text-white rounded-lg px-3 py-2 text-sm hover:bg-green-800 disabled:opacity-40"
          >
            →
          </button>
        </div>
      </form>
    </div>
  )
}
