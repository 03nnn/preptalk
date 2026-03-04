"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, BarChart, LineChart } from "recharts"
import { TrendingUp, Mic, Star, Loader2 } from "lucide-react"

interface Session {
  session_id: string
  user_id: string
  date?: string
  category?: string
  question?: string
  scores?: { fluency: number; grammar: number; confidence: number; overall: number }
  feedback?: { scores: { fluency: number; grammar: number; confidence: number; overall: number } }
}

function StatCard({ icon: Icon, accent, label, value, sub }: { icon: any; accent: string; label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex items-start gap-4 hover:shadow-lg hover:border-violet-200 transition-all duration-200">
      <div className={`w-12 h-12 rounded-2xl ${accent} flex items-center justify-center shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-black text-slate-900 mt-0.5 tracking-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"progress" | "categories">("progress")

  useEffect(() => {
    const user = localStorage.getItem("preptalk_user")
    if (!user) { router.replace("/login"); return }
    async function fetchData() {
      setError("")
      setLoading(true)
      try {
        const user_id = localStorage.getItem("preptalk_user") || "demo-user"
        const res = await fetch(`/api/progress?user_id=${user_id}`)
        if (!res.ok) throw new Error("Failed to fetch progress data")
        const data = await res.json()
        setSessions(Array.isArray(data) ? data : [])
      } catch {
        setError("Failed to load progress data.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getScores = (s: Session) =>
    s.scores || (s.feedback && s.feedback.scores) || { fluency: 0, grammar: 0, confidence: 0, overall: 0 }

  const totalInterviews = sessions.length
  const averageScore =
    totalInterviews
      ? (sessions.reduce((sum, s) => sum + (getScores(s).overall ?? 0), 0) / totalInterviews).toFixed(1)
      : "-"

  const categoryStats = sessions.reduce(
    (acc, s) => {
      if (!s.category) return acc
      const scores = getScores(s)
      if (!acc[s.category]) acc[s.category] = { count: 0, total: 0 }
      acc[s.category].count++
      acc[s.category].total += scores.overall ?? 0
      return acc
    },
    {} as Record<string, { count: number; total: number }>
  )

  const mostImproved =
    Object.entries(categoryStats).sort(
      (a, b) => b[1].total / b[1].count - a[1].total / a[1].count
    )[0]?.[0] || "-"

  const progressByMonthMap: Record<string,{ month: string; fluency: number; grammar: number; confidence: number; count: number }> = {}
  sessions.forEach((s) => {
    const scores = getScores(s)
    if (!s.date) return
    let dateObj: Date
    try {
      dateObj = new Date(s.date)
      if (isNaN(dateObj.getTime())) return
    } catch { return }
    const month = dateObj.toLocaleString("default", { month: "short", year: "2-digit" })
    if (!progressByMonthMap[month])
      progressByMonthMap[month] = { month, fluency: 0, grammar: 0, confidence: 0, count: 0 }
    progressByMonthMap[month].fluency += scores.fluency ?? 0
    progressByMonthMap[month].grammar += scores.grammar ?? 0
    progressByMonthMap[month].confidence += scores.confidence ?? 0
    progressByMonthMap[month].count++
  })
  const progressData = Object.values(progressByMonthMap).map((d) => ({
    month: d.month,
    fluency: d.count ? +(d.fluency / d.count).toFixed(1) : 0,
    grammar: d.count ? +(d.grammar / d.count).toFixed(1) : 0,
    confidence: d.count ? +(d.confidence / d.count).toFixed(1) : 0,
  }))

  const categoryData = Object.entries(categoryStats).map(([name, val]) => ({
    name,
    interviews: val.count,
    avgScore: val.count ? +(val.total / val.count).toFixed(1) : 0,
  }))

  const recentHistory = sessions.slice(0, 5).map((s) => ({
    id: s.session_id,
    date: s.date,
    category: s.category,
    question: s.question,
    score: getScores(s).overall ?? 0,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Progress Dashboard</h1>
        <p className="text-slate-500 mt-1">Track your interview performance over time</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Mic} accent="bg-violet-100 text-violet-600" label="Total Interviews" value={totalInterviews} sub="Practice sessions" />
            <StatCard icon={TrendingUp} accent="bg-emerald-100 text-emerald-600" label="Average Score" value={averageScore} sub="Across all sessions" />
            <StatCard icon={Star} accent="bg-amber-100 text-amber-600" label="Top Category" value={mostImproved} sub="Best average score" />
          </div>

          {/* Charts */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            {/* Tab buttons */}
            <div className="flex gap-2 mb-6">
              {(["progress", "categories"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t === "progress" ? "Progress Over Time" : "By Category"}
                </button>
              ))}
            </div>

            {tab === "progress" && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Skills over time (avg per month)</h2>
                {!progressData.length ? (
                  <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data yet. Complete more practice sessions to see your progress.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="fluency" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Fluency" />
                      <Line type="monotone" dataKey="grammar" stroke="#10b981" strokeWidth={2} dot={false} name="Grammar" />
                      <Line type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={2} dot={false} name="Confidence" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {tab === "categories" && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Performance by question category</h2>
                {!categoryData.length ? (
                  <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No category data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="interviews" fill="#8b5cf6" name="Interviews" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="avgScore" fill="#10b981" name="Avg Score" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>

          {/* Recent sessions table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Recent Sessions</h2>
            {recentHistory.length === 0 ? (
              <p className="text-slate-400 text-sm">No sessions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Date</th>
                      <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Category</th>
                      <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Question</th>
                      <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHistory.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600">{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center bg-violet-50 text-violet-700 rounded-full px-2.5 py-0.5 text-xs font-medium">{s.category || "-"}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">{s.question || "-"}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{s.score.toFixed(1)}<span className="text-slate-400 font-normal">/10</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
