import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Loader2, AlertCircle, Key } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `Sos Zenith AI, el asistente financiero de Zenith Finanzas. Sos experto en:
- Mercados financieros argentinos (MERVAL, bonos, acciones)
- Herramientas de inversión: CEDEARs, plazo fijo, FCI, LECAP
- Tipos de cambio y dinámica del dólar en Argentina
- Finanzas personales: presupuesto, deuda, ahorro
- El modelo ABSOLUTE ZENITH v2.0 de deep learning para trading HFT

Respondé siempre en español, de forma concisa y práctica. No des asesoramiento financiero formal — siempre aclará que son opiniones educativas. Usá formato markdown cuando ayude a la claridad.`

interface Props {
  onClose: () => void
}

export default function ChatModal({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Zenith AI. Podés preguntarme sobre mercados argentinos, inversiones, CEDEARs, bonos, o finanzas personales. ¿En qué te ayudo?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('zenith_claude_key') ?? '')
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('zenith_claude_key'))
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function saveKey(key: string) {
    localStorage.setItem('zenith_claude_key', key)
    setApiKey(key)
    setShowKeyInput(false)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    if (!apiKey) { setShowKeyInput(true); return }

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { content: Array<{ type: string; text: string }> }
      const assistantText = data.content.find(c => c.type === 'text')?.text ?? ''
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="bg-[#0c1221] border border-[#1e293b] rounded-2xl w-full max-w-sm shadow-2xl flex flex-col pointer-events-auto"
           style={{ height: '520px' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e293b] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <div className="text-[#f8fafc] font-bold text-sm">Zenith AI</div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span className="text-[#10b981] text-[10px]">claude-haiku · activo</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowKeyInput(v => !v)}
              className="p-1.5 text-[#64748b] hover:text-[#f8fafc] transition-colors"
              title="Configurar API key"
            >
              <Key size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 text-[#64748b] hover:text-[#f8fafc] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* API Key input */}
        {showKeyInput && (
          <div className="p-3 border-b border-[#1e293b] bg-[#111827] shrink-0">
            <p className="text-[#64748b] text-xs mb-2">
              Ingresá tu Anthropic API key para activar el chat. Se guarda solo en tu navegador.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-ant-..."
                defaultValue={apiKey}
                id="api-key-input"
                className="flex-1 bg-[#0c1221] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#f8fafc] placeholder-[#475569] outline-none font-mono focus:border-[#334155]"
              />
              <button
                onClick={() => {
                  const el = document.getElementById('api-key-input') as HTMLInputElement
                  if (el?.value) saveKey(el.value.trim())
                }}
                className="px-3 py-1.5 rounded-lg bg-[#10b981]/10 text-[#10b981] text-xs font-semibold hover:bg-[#10b981]/20 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-[#10b981] to-[#6366f1]'
                  : 'bg-[#1e293b]'
              }`}>
                {msg.role === 'assistant'
                  ? <Bot size={12} className="text-white" />
                  : <User size={12} className="text-[#94a3b8]" />}
              </div>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#1e293b] text-[#f8fafc] rounded-tr-none'
                    : 'bg-[#111827] text-[#e2e8f0] rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center shrink-0">
                <Bot size={12} className="text-white" />
              </div>
              <div className="bg-[#111827] rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-2">
                <Loader2 size={13} className="text-[#10b981] animate-spin" />
                <span className="text-[#64748b] text-xs">Pensando...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-[#450a0a]/40 border border-[#ef4444]/20 rounded-xl p-3 text-xs text-[#fca5a5]">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#1e293b] shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Preguntame sobre inversiones..."
              disabled={loading}
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-[#f8fafc] placeholder-[#475569] outline-none focus:border-[#334155] disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-xl bg-[#10b981] flex items-center justify-center hover:bg-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={14} className="text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
