"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mic, Square, Loader2, Volume2, VolumeX, Play,
  ChevronRight, AlertCircle, CheckCircle, Sparkles, Zap
} from "lucide-react"


type Category = "hr" | "technical" | "behavioral"
type Feedback = {
  scores: { fluency: number; grammar: number; confidence: number; relevance: number; overall: number }
  analysis: {
    strengths: string[]
    improvements: string[]
    fillerWords: { count: number; words: string[] }
    sentiment: string
    tone: string
  }
  tips: string[]
  summary: string
  transcript: string
  question: string
  category: Category
}
type ConversationTurn = { question: string; transcript: string; category: Category }

const jobDomains = ["Data Scientist","AI Engineer","Data Analytics","Blockchain","Cybersecurity","Software Engineer","Cloud Engineer","DevOps Engineer","IoT Engineer","Web Developer"]
const difficulties = ["Easy","Medium","Hard"]

const ScoreRow = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-sm mb-1.5">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="font-bold text-slate-900">{value}<span className="text-slate-400 font-normal">/10</span></span>
    </div>
    <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
        style={{ width: `${value * 10}%` }}
      />
    </div>
  </div>
)

/* ── Natural TTS helpers ─────────────────────────────────────────────── */

// Ranked preference list — first match wins.
// macOS ships Samantha, Ava, Zoe; Chrome has Google voices; Edge has Microsoft ones.
const PREFERRED_VOICES = [
  // Premium macOS voices (if user has downloaded them)
  "Ava (Premium)", "Samantha (Enhanced)", "Zoe (Premium)",
  // Standard macOS natural-sounding voices
  "Samantha", "Ava", "Zoe", "Karen", "Moira", "Tessa",
  // Google Chrome voices (very natural)
  "Google UK English Female", "Google US English",
  // Microsoft Edge voices
  "Microsoft Zira", "Microsoft Jenny Online (Natural)",
]

function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  // Try exact name match from our preference list
  for (const name of PREFERRED_VOICES) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  // Fallback: any English female-sounding voice
  return (
    voices.find(v => v.lang.startsWith("en") && /female|zira|samantha|ava|jenny|zoe|karen/i.test(v.name)) ||
    voices.find(v => v.lang === "en-US") ||
    voices.find(v => v.lang.startsWith("en")) ||
    null
  )
}

function speakText(text: string, onStart: () => void, onEnd: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = getPreferredVoice()
    if (voice) utterance.voice = voice
    utterance.rate   = 0.92   // slightly slower than default for clarity
    utterance.pitch  = 1.02   // just above default for warmth
    utterance.volume = 1
    utterance.onstart = () => onStart()
    utterance.onend   = () => onEnd()
    utterance.onerror = () => onEnd()
    window.speechSynthesis.speak(utterance)
  }
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      doSpeak()
    }
  }
}

const catColour: Record<string, string> = {
  hr:         "bg-violet-100 text-violet-700 border-violet-200",
  technical:  "bg-blue-100 text-blue-700 border-blue-200",
  behavioral: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

export default function PracticeInterview() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [category, setCategory] = useState<Category>("hr")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [conversation, setConversation] = useState<ConversationTurn[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [error, setError] = useState<string>("")
  const [audioURL, setAudioURL] = useState<string>("")
  const [jobDomain, setJobDomain] = useState(jobDomains[0])
  const [difficulty, setDifficulty] = useState(difficulties[0])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  /* ── Auth gate ── */
  useEffect(() => {
    const user = localStorage.getItem("preptalk_user")
    if (!user) {
      router.replace("/login")
    } else {
      setAuthChecked(true)
    }
  }, [router])

  useEffect(() => {
    if (typeof window !== "undefined") import("./polyfill-mediarecorder")
  }, [])

  /* ── Auto-speak on question load ─────────────────────────────────────── */
  useEffect(() => {
    if (!currentQuestion) return
    const timer = setTimeout(() => {
      speakText(currentQuestion, () => setIsSpeaking(true), () => setIsSpeaking(false))
    }, 600)
    return () => clearTimeout(timer)
  }, [currentQuestion])

  /* ── Manual TTS toggle ────────────────────────────────────────────────── */
  const toggleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      speakText(currentQuestion, () => setIsSpeaking(true), () => setIsSpeaking(false))
    }
  }

  const getRandomQuestion = async (cat: Category) => {
    setError("")
    try {
      const params = new URLSearchParams({ category: cat, jobDomain, difficulty })
      const res = await fetch("/api/question?" + params.toString())
      const data = await res.json()
      setCurrentQuestion(data.question)
    } catch {
      setError("Failed to fetch question. Please try again.")
    }
  }

  const startInterview = () => getRandomQuestion(category)

  const startRecording = async () => {
    try {
      setRecordingTime(0)
      setAudioChunks([])
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!window.MediaRecorder) throw new Error("MediaRecorder not available")
      const recorder = new window.MediaRecorder(stream, {
        mimeType: window.MediaRecorder.isTypeSupported('audio/wav') ? 'audio/wav' : 'audio/webm'
      })
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
          setAudioChunks(prev => [...prev, e.data])
        }
      }
      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const mimeType = recorder.mimeType || 'audio/wav'
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          setAudioURL(URL.createObjectURL(audioBlob))
          handleAudioSubmit(audioBlob)
        } else {
          setError("No audio data captured. Please try again.")
        }
      }
      setMediaRecorder(recorder)
      recorder.start(1000)
      setIsRecording(true)
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (e: any) {
      setError(`Microphone error: ${e?.message || "Unknown"}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      try {
        if (typeof mediaRecorder.requestData === 'function') mediaRecorder.requestData()
        mediaRecorder.stop()
        if (mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      } catch (e: any) {
        setError(`Stop error: ${e?.message}`)
      }
    }
  }

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setError("")
    if (!audioBlob || audioBlob.size === 0) { setError("No audio data."); setIsProcessing(false); return }
    try {
      const user_id = localStorage.getItem("preptalk_user") || "demo-user"
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.webm")
      formData.append("user_id", user_id)
      formData.append("question", currentQuestion)
      formData.append("category", category)
      const res = await fetch("/api/analyze_interview", { method: "POST", body: formData })
      const data = await res.json()
      if (data.transcript) {
        setTranscript(data.transcript)
        if (data.feedback) setFeedback(data.feedback)
        setConversation(prev => [...prev, { question: currentQuestion, transcript: data.transcript, category }])
      } else {
        throw new Error("No transcript returned")
      }
    } catch (e: any) {
      setError(`Failed to analyse audio: ${e?.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGetFeedback = async () => {
    setIsProcessing(true)
    setError("")
    try {
      const user_id = localStorage.getItem("preptalk_user") || "demo-user"
      const conversationText = conversation.map(t => `Q: ${t.question}\nA: ${t.transcript}`).join("\n\n")
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: conversationText, user_id }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setFeedback(await res.json())
    } catch (e: any) {
      setError(`Failed to get feedback: ${e?.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNextQuestion = async () => {
    setTranscript(""); setFeedback(null); setAudioURL(""); setAudioChunks([])
    setIsRecording(false); setRecordingTime(0); setIsProcessing(false); setError("")
    setMediaRecorder(null); setIsSpeaking(false)
    await getRandomQuestion(category)
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
        if (mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [mediaRecorder])

  const inInterview = !!currentQuestion

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* ── Page header ── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-violet-500" />
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Practice Interview</h1>
        </div>
        <p className="text-slate-500 ml-7">
          Configure your session — the AI will read each question aloud automatically.
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Setup card ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <h2 className="font-bold text-slate-900 text-lg">Session Setup</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Job Domain</label>
            <Select value={jobDomain} onValueChange={setJobDomain} disabled={inInterview}>
              <SelectTrigger className="rounded-xl border-slate-200 h-11">
                <SelectValue placeholder="Job domain" />
              </SelectTrigger>
              <SelectContent>
                {jobDomains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty} disabled={inInterview}>
              <SelectTrigger className="rounded-xl border-slate-200 h-11">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
            <Select value={category} onValueChange={v => setCategory(v as Category)} disabled={inInterview}>
              <SelectTrigger className="rounded-xl border-slate-200 h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hr">HR Questions</SelectItem>
                <SelectItem value="technical">Technical Questions</SelectItem>
                <SelectItem value="behavioral">Behavioral Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!inInterview && (
          <button
            onClick={startInterview}
            className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-lg rounded-2xl px-10 py-4 shadow-[0_0_30px_rgba(139,92,246,0.45)] hover:shadow-[0_0_50px_rgba(139,92,246,0.7)] hover:scale-[1.02] active:scale-100 transition-all duration-200"
          >
            <Play className="h-5 w-5" /> Start Interview
          </button>
        )}
      </div>

      {/* ── Question card ── */}
      {inInterview && (
        <div className="bg-white rounded-3xl border-2 border-violet-100 shadow-[0_4px_30px_rgba(139,92,246,0.08)] p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className={`inline-flex items-center border rounded-full px-3 py-1 text-xs font-semibold mb-4 capitalize ${catColour[category] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {category}
              </span>
              <p className="text-xl font-semibold text-slate-900 leading-relaxed">{currentQuestion}</p>
            </div>
            <button
              onClick={toggleSpeak}
              title={isSpeaking ? "Stop speaking" : "Replay question aloud"}
              className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                isSpeaking
                  ? "bg-violet-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.6)] scale-110"
                  : "bg-slate-100 hover:bg-violet-100 text-slate-500 hover:text-violet-600 hover:scale-105"
              }`}
            >
              {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {isSpeaking && (
            <div className="mt-4 flex items-center gap-2 text-xs text-violet-500 font-medium">
              <span className="flex gap-0.5">
                {[0,1,2,3].map(i => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-violet-400 animate-bounce"
                    style={{ height: `${6 + (i % 2) * 4}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </span>
              Speaking…
            </div>
          )}
        </div>
      )}

      {/* ── Recording panel ── */}
      {inInterview && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
          <h2 className="font-bold text-slate-900 text-lg mb-6">Your Answer</h2>

          {/* Recording timer */}
          {isRecording && (
            <div className="flex items-center justify-center gap-5 mb-7">
              <div className="w-4 h-4 rounded-full bg-red-500 recording-pulse" />
              <span className="text-4xl font-mono font-black text-slate-900 tabular-nums">
                {formatTime(recordingTime)}
              </span>
              <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Live</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500 py-8">
              <Loader2 className="h-9 w-9 animate-spin text-violet-500" />
              <p className="text-sm font-medium">Analysing your response with AI…</p>
            </div>
          )}

          {transcript && !isProcessing && (
            <div className="bg-gradient-to-br from-slate-50 to-violet-50/30 rounded-2xl p-5 mb-6 border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Transcript</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{transcript}</p>
            </div>
          )}

          {audioURL && !isProcessing && (
            <div className="mb-6">
              <audio src={audioURL} controls className="w-full h-10 rounded-xl" />
            </div>
          )}

          {/* ── Action Buttons — BIG & GLOWING ── */}
          <div className="flex flex-wrap gap-4">
            {!isRecording && !isProcessing && !transcript && (
              <button
                onClick={startRecording}
                className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-lg rounded-2xl px-10 py-4 shadow-[0_0_30px_rgba(139,92,246,0.45)] hover:shadow-[0_0_55px_rgba(139,92,246,0.75)] hover:scale-[1.03] active:scale-100 transition-all duration-200 mic-glow"
              >
                <Mic className="h-6 w-6" /> Start Recording
              </button>
            )}
            {isRecording && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-lg rounded-2xl px-10 py-4 shadow-[0_0_25px_rgba(239,68,68,0.45)] hover:shadow-[0_0_50px_rgba(239,68,68,0.7)] hover:scale-[1.03] active:scale-100 transition-all duration-200 stop-glow"
              >
                <Square className="h-5 w-5" /> Stop Recording
              </button>
            )}
            {isProcessing && (
              <button disabled className="flex items-center gap-3 bg-slate-200 text-slate-500 font-black text-lg rounded-2xl px-10 py-4 cursor-not-allowed">
                <Loader2 className="h-5 w-5 animate-spin" /> Processing…
              </button>
            )}
            {!isProcessing && transcript && !feedback && (
              <button
                onClick={handleGetFeedback}
                className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-lg rounded-2xl px-10 py-4 shadow-[0_0_30px_rgba(139,92,246,0.45)] hover:shadow-[0_0_55px_rgba(139,92,246,0.75)] hover:scale-[1.03] active:scale-100 transition-all duration-200"
              >
                <CheckCircle className="h-5 w-5" /> Get AI Feedback
              </button>
            )}
            {!isProcessing && transcript && feedback && (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black text-lg rounded-2xl px-10 py-4 shadow-[0_0_20px_rgba(15,23,42,0.3)] hover:shadow-[0_0_40px_rgba(15,23,42,0.5)] hover:scale-[1.03] active:scale-100 transition-all duration-200"
              >
                Next Question <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback card ── */}
      {feedback && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7 space-y-7">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <h2 className="font-black text-slate-900 text-xl">AI Feedback</h2>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Performance Scores</p>
            <div className="space-y-4">
              <ScoreRow label="Fluency"    value={feedback.scores.fluency} />
              <ScoreRow label="Grammar"    value={feedback.scores.grammar} />
              <ScoreRow label="Confidence" value={feedback.scores.confidence} />
              <ScoreRow label="Relevance"  value={feedback.scores.relevance ?? 0} />
              <ScoreRow label="Overall"    value={feedback.scores.overall} />
            </div>
          </div>

          {feedback.summary && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">AI Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{feedback.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">Strengths</p>
              <ul className="space-y-2">
                {feedback.analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Improve</p>
              <ul className="space-y-2">
                {feedback.analysis.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Sentiment</p>
              <p className="font-bold text-slate-800 mt-1 capitalize">{feedback.analysis.sentiment}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Tone</p>
              <p className="font-bold text-slate-800 mt-1 capitalize">{feedback.analysis.tone}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Filler Words</p>
              <p className="font-bold text-slate-800 mt-1">{feedback.analysis.fillerWords.count} used</p>
            </div>
          </div>

          {feedback.analysis.fillerWords.words.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Fillers detected</p>
              <div className="flex flex-wrap gap-2">
                {feedback.analysis.fillerWords.words.map((w, i) => (
                  <span key={i} className="bg-red-50 text-red-600 border border-red-100 rounded-full px-3 py-1 text-xs font-bold">
                    &ldquo;{w}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          )}

          {feedback.tips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Tips for next time</p>
              <ul className="space-y-2">
                {feedback.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-violet-500 shrink-0" />{t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleNextQuestion}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-lg rounded-2xl px-10 py-4 shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_55px_rgba(139,92,246,0.7)] hover:scale-[1.01] active:scale-100 transition-all duration-200"
          >
            Next Question <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
