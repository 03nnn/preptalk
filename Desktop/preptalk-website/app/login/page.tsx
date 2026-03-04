"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BrainCircuit, Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem("preptalk_user", username)
        router.push("/")
      } else {
        setError(data.message || "Invalid credentials")
      }
    } catch {
      setError("Could not reach server. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(139,92,246,0.4)]">
          <BrainCircuit className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Welcome back</h1>
        <p className="text-slate-400 mt-1 text-sm">Sign in to your PrepTalk account</p>
      </div>

      {/* Card */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl py-3 font-black text-sm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.01] active:scale-100 duration-200"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
