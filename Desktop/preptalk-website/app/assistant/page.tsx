"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2, BrainCircuit, Lightbulb, ChevronRight } from "lucide-react"

const SUGGESTED = [
  "How can I improve my answer to 'Tell me about yourself'?",
  "What are common mistakes in technical interviews?",
  "How should I talk about my weaknesses?",
  "Tips for answering behavioral questions?",
  "How to prepare for a software engineering interview?",
]

const TIPS = [
  "Research the company thoroughly before your interview",
  "Prepare 3–4 concrete achievement stories",
  "Use the STAR method for behavioural questions",
  "Prepare thoughtful questions to ask the interviewer",
  "Follow up with a thank-you email within 24 h",
]

type Message = { role: "user" | "assistant"; content: string }

async function callChatAPI(messages: Message[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error("Chat API error")
  const data = await res.json()
  return data.message || "Sorry, I couldn't generate a response."
}

export default function ChatbotAssistant() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your PrepTalk AI Coach. Ask me anything about interview prep — I'm here to help you land that job! 🎯" },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const user = localStorage.getItem("preptalk_user")
    if (!user) router.replace("/login")
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return
    const userMsg: Message = { role: "user", content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setIsLoading(true)
    try {
      const reply = await callChatAPI(nextMessages)
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Interview Assistant</h1>
        <p className="text-slate-500 mt-1">Get personalised advice powered by Groq AI</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Chat panel */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 520 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}>
                  {msg.role === "assistant" ? <BrainCircuit className="h-4 w-4" /> : "You"}
                </div>
                {/* Bubble */}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-100 text-slate-800 rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <BrainCircuit className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 px-4 py-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
            >
              <input
                type="text"
                placeholder="Ask about interview preparation..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-100 duration-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-72 space-y-4 shrink-0">
          {/* Suggested */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Suggested Questions</h2>
            <div className="space-y-2">
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="w-full text-left text-sm text-slate-600 hover:text-violet-700 bg-slate-50 hover:bg-violet-50 rounded-xl px-3 py-2.5 flex items-start gap-2 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-violet-400" />
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Interview Tips
            </h2>
            <ul className="space-y-2">
              {TIPS.map((tip, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
