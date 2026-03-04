import Link from "next/link"
import { Mic, BarChart2, FileText, MessageSquare, ArrowRight, Star, Zap, Target, BrainCircuit } from "lucide-react"

const features = [
  {
    icon: Mic,
    color: "bg-violet-100 text-violet-600",
    title: "Voice Practice",
    description: "Record your answers and get instant AI-powered analysis on fluency, grammar, and confidence.",
    href: "/practice",
    cta: "Start Practising",
  },
  {
    icon: FileText,
    color: "bg-blue-100 text-blue-600",
    title: "AI Feedback",
    description: "Receive detailed reports on tone, grammar, filler words, and actionable tips to improve.",
    href: "/reports",
    cta: "View Reports",
  },
  {
    icon: BarChart2,
    color: "bg-emerald-100 text-emerald-600",
    title: "Track Progress",
    description: "Visual analytics to monitor your improvement across sessions and question categories.",
    href: "/dashboard",
    cta: "Open Dashboard",
  },
  {
    icon: MessageSquare,
    color: "bg-amber-100 text-amber-600",
    title: "AI Assistant",
    description: "Chat with your personal AI coach for interview tips, mock Q&A, and career advice.",
    href: "/assistant",
    cta: "Ask Coach",
  },
]

const stats = [
  { value: "10+", label: "Question Categories" },
  { value: "3", label: "Difficulty Levels" },
  { value: "AI", label: "Powered Feedback" },
  { value: "Free", label: "To Use" },
]

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-10 md:p-14 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-violet-400/20 rounded-full blur-2xl" />

        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-1.5 text-white text-sm font-medium mb-5">
            <Zap className="h-3.5 w-3.5" /> Powered by Groq AI
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            Ace Your Next<br />
            <span className="text-yellow-300">Interview</span> with Confidence
          </h1>
          <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
            AI-powered mock interviews with voice recording, instant feedback, and progress tracking — built for the Indian job market.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black rounded-2xl px-8 py-4 text-lg hover:bg-violet-50 transition shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-100 duration-200"
            >
              <Mic className="h-5 w-5" /> Start Practice
            </Link>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white font-bold rounded-2xl px-8 py-4 text-lg hover:bg-white/25 transition border border-white/30 hover:scale-[1.02] active:scale-100 duration-200"
            >
              Talk to AI Coach <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-indigo-200 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-black text-slate-900 mb-5 tracking-tight">Everything you need to prepare</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col group hover:shadow-lg hover:border-violet-200 transition-all duration-200"
            >
              <div className={`w-11 h-11 rounded-2xl ${f.color} flex items-center justify-center mb-4`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5 text-base">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed flex-1">{f.description}</p>
              <Link
                href={f.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-800 group-hover:gap-2 transition-all"
              >
                {f.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Why PrepTalk */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-10">
        <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Why PrepTalk?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Tailored for India", text: "Questions and feedback designed for Indian companies, industries, and interview culture." },
            { icon: Zap, title: "Real-time AI Analysis", text: "Get instant insights on tone, grammar, confidence, and filler-word usage after every answer." },
            { icon: Star, title: "Multiple Domains", text: "Practice for Software Engineering, Data Science, DevOps, Cybersecurity, and more." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-6">
        <p className="text-slate-500 mb-5 text-lg">Ready to level up your interview skills?</p>
        <Link
          href="/practice"
          className="inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-lg rounded-2xl px-10 py-4 shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.7)] hover:scale-[1.02] active:scale-100 transition-all duration-200"
        >
          <Mic className="h-5 w-5" /> Start Your First Interview
        </Link>
      </section>
    </div>
  )
}

