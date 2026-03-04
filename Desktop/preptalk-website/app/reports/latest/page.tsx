"use client"

import { Download, ThumbsUp, ThumbsDown, BarChart2, MessageSquare, Loader2, FileText, Lightbulb, Mic } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LatestReport() {
  const router = useRouter()
  const [feedback, setFeedback] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"analysis" | "tips" | "transcript">("analysis")

  useEffect(() => {
    const user = localStorage.getItem("preptalk_user")
    if (!user) { router.replace("/login"); return }
    async function fetchLatest() {
      try {
        const user_id = user || "demo-user"
        const res = await fetch(`/api/progress?user_id=${user_id}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setFeedback(data[0])
        }
      } catch (err) {
        console.error("Failed to fetch report:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchLatest()
  }, [])

  const userId = typeof window !== 'undefined'
    ? (localStorage.getItem("preptalk_user") || "demo-user")
    : "demo-user";
  const pdfUrl = `/api/feedback?user_id=${userId}&session_id=${feedback?.session_id}`;

  const downloadPdf = async () => {
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        let msg = `HTTP ${res.status}`;
        if (ct.includes("application/json")) {
          const err = await res.json();
          msg += `: ${err.error || JSON.stringify(err)}`;
        } else {
          const text = await res.text();
          msg += `: ${text}`;
        }
        alert(msg);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'feedback.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  // Score bar component
  const ScoreBar = ({ label, value }: { label: string; value: number }) => {
    const pct = Math.min(value * 10, 100)
    const color = value >= 7 ? "from-emerald-400 to-emerald-600" : value >= 4 ? "from-amber-400 to-amber-600" : "from-red-400 to-red-600"
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="text-2xl font-black text-slate-900 tracking-tight">{value?.toFixed(1)}<span className="text-sm font-normal text-slate-400">/10</span></span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Interview Feedback</h1>
          <p className="text-slate-500 mt-1">Your latest interview report will appear here</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Mic className="h-7 w-7 text-violet-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No reports yet</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Complete a practice interview session to see your AI-powered feedback report here.
          </p>
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl px-8 py-3.5 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-100 transition-all duration-200"
          >
            <Mic className="h-4 w-4" /> Start Practice
          </Link>
        </div>
      </div>
    )
  }

  if (!feedback.question && !feedback.transcript) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Interview Feedback</h1>
          <p className="text-slate-500 mt-1">Your latest interview report</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <p className="text-slate-500 text-sm mb-6">The latest feedback data is incomplete. Try completing another practice session.</p>
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl px-8 py-3.5 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-100 transition-all duration-200"
          >
            <Mic className="h-4 w-4" /> Start Practice
          </Link>
        </div>
      </div>
    )
  }

  const scores = feedback.scores || (feedback.feedback && feedback.feedback.scores)
  const analysis = feedback.analysis || (feedback.feedback && feedback.feedback.analysis)
  const tips = feedback.tips || (feedback.feedback && feedback.feedback.tips)
  const strongPoints = feedback.strong_points || (feedback.feedback && feedback.feedback.strong_points)
  const weakPoints = feedback.weak_points || (feedback.feedback && feedback.feedback.weak_points)
  const suggestions = feedback.suggestions || (feedback.feedback && feedback.feedback.suggestions)

  if (!scores) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-6 py-4 text-sm">
          No scores available for this report. Please try another session.
        </div>
      </div>
    )
  }

  const tabs = [
    { key: "analysis" as const, label: "Detailed Analysis", icon: BarChart2 },
    { key: "tips" as const, label: "Suggestions", icon: Lightbulb },
    { key: "transcript" as const, label: "Full Transcript", icon: FileText },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Interview Feedback</h1>
          <p className="text-slate-500 mt-1">
            {feedback.category ? feedback.category.charAt(0).toUpperCase() + feedback.category.slice(1) : "General"} Question &bull; {feedback.date ? new Date(feedback.date).toLocaleDateString() : new Date().toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={downloadPdf}
          className="mt-3 md:mt-0 inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl px-5 py-2.5 text-sm hover:bg-slate-50 hover:border-violet-200 transition-all shadow-sm"
        >
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Question</h3>
          <p className="text-lg text-slate-900 bg-violet-50 rounded-2xl p-4 font-medium leading-relaxed">{feedback.question}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Your Response</h3>
          <p className="text-slate-700 bg-slate-50 rounded-2xl p-4 leading-relaxed">{feedback.transcript}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2">
          <ScoreBar label="Fluency" value={scores.fluency} />
          <ScoreBar label="Grammar" value={scores.grammar} />
          <ScoreBar label="Confidence" value={scores.confidence} />
          <ScoreBar label="Relevance" value={scores.relevance ?? 0} />
          <ScoreBar label="Overall" value={scores.overall} />
        </div>

        {(feedback.summary || (feedback.feedback && feedback.feedback.summary)) && (
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 mt-4">
            <h3 className="text-sm font-bold text-violet-700 uppercase tracking-wider mb-2">AI Summary</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {feedback.summary || (feedback.feedback && feedback.feedback.summary)}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === t.key
                  ? "bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-violet-200"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Analysis Tab */}
        {activeTab === "analysis" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-1">Detailed Analysis</h2>
              <p className="text-sm text-slate-500">AI-powered analysis of your interview response</p>
            </div>

            {strongPoints && Array.isArray(strongPoints) && strongPoints.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /></div>
                  Strong Points
                </h3>
                <ul className="space-y-2">
                  {strongPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {weakPoints && Array.isArray(weakPoints) && weakPoints.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><ThumbsDown className="h-3.5 w-3.5 text-amber-600" /></div>
                  Areas to Improve
                </h3>
                <ul className="space-y-2">
                  {weakPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis && analysis.strengths && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /></div>
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {analysis.strengths.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis && analysis.improvements && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><ThumbsDown className="h-3.5 w-3.5 text-amber-600" /></div>
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {analysis.improvements.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis && analysis.fillerWords && (
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="font-bold text-slate-900 mb-2">Filler Words</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {analysis.fillerWords.words.map((word: string, i: number) => (
                    <span key={i} className="inline-flex items-center bg-white border border-slate-200 text-slate-700 rounded-full px-3 py-1 text-xs font-medium">{word}</span>
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  You used {analysis.fillerWords.count} filler words in your response.
                </p>
              </div>
            )}

            {analysis && (analysis.sentiment || analysis.tone) && (
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="font-bold text-slate-900 mb-2">Tone Analysis</h3>
                {analysis.sentiment && <p className="text-sm text-slate-700 mb-1"><span className="font-medium">Sentiment:</span> {analysis.sentiment}</p>}
                {analysis.tone && <p className="text-sm text-slate-700"><span className="font-medium">Tone:</span> {analysis.tone}</p>}
              </div>
            )}

            {feedback.overall_feedback && (
              <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100">
                <h3 className="font-bold text-slate-900 mb-2">Overall Feedback</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{feedback.overall_feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Tips Tab */}
        {activeTab === "tips" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-1">Suggestions</h2>
              <p className="text-sm text-slate-500">Personalized suggestions to enhance your interview skills</p>
            </div>

            {suggestions && Array.isArray(suggestions) && suggestions.length > 0 ? (
              <ul className="space-y-3">
                {suggestions.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-4 bg-slate-50 rounded-2xl p-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-black">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed pt-1">{tip}</p>
                  </li>
                ))}
              </ul>
            ) : tips && Array.isArray(tips) && tips.length > 0 ? (
              <ul className="space-y-3">
                {tips.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-4 bg-slate-50 rounded-2xl p-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-black">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed pt-1">{tip}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">No suggestions available for this report.</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl px-6 py-3 text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-100 transition-all duration-200"
              >
                <Mic className="h-4 w-4" /> Practice Again
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl px-6 py-3 text-sm hover:bg-slate-50 hover:border-violet-200 transition-all"
              >
                <BarChart2 className="h-4 w-4" /> View Progress
              </Link>
            </div>
          </div>
        )}

        {/* Transcript Tab */}
        {activeTab === "transcript" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-1">Full Transcript</h2>
              <p className="text-sm text-slate-500">Complete transcript of your interview response</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {feedback.transcript}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-4">
        <p className="text-slate-500 mb-4 text-sm">Need more help with this question?</p>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl px-8 py-3.5 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-100 transition-all duration-200"
        >
          <MessageSquare className="h-4 w-4" /> Ask AI Assistant
        </Link>
      </div>
    </div>
  )
}
