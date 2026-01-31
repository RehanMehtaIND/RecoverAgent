"use client"

import { useEffect, useMemo, useState } from "react"

type Run = {
  id: number
  name: string
  status: string
  conclusion: string | null
  html_url: string
  head_sha: string
  created_at: string
}

export default function RunsPage() {
  const params = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), [])
  const owner = params.get("owner") || ""
  const repo = params.get("repo") || ""
  const base = params.get("base") || "main"
  const token = params.get("token") || ""

  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    const go = async () => {
      setLoading(true)
      setErr("")
      const r = await fetch(`/api/runs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&token=${encodeURIComponent(token)}`)
      const j = await r.json()
      if (!r.ok) {
        setErr(j?.error || "Failed")
        setRuns([])
      } else {
        setRuns(j.runs || [])
      }
      setLoading(false)
    }
    if (owner && repo) go()
  }, [owner, repo, token])

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Workflow Runs</h1>
        <a href={`/?owner=${owner}&repo=${repo}`} style={{ color: "#aab" }}>back</a>
      </div>

      <div style={{ opacity: 0.85 }}>
        Repo: <b>{owner}/{repo}</b> · Base: <b>{base}</b>
      </div>

      {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
      {err && <div style={{ color: "#ff9a9a" }}>{err}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {runs.map(run => (
          <div key={run.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>{run.name || "workflow"}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  {run.status} · {run.conclusion || "—"} · {new Date(run.created_at).toLocaleString()}
                </div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>sha: {run.head_sha.slice(0, 8)}</div>
              </div>
              <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                <a href={run.html_url} target="_blank" style={link}>open</a>
                <a
                  href={`/run/${run.id}?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&base=${encodeURIComponent(base)}&token=${encodeURIComponent(token)}`}
                  style={link}
                >
                  details
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {runs.length === 0 && !loading && !err && (
        <div style={{ opacity: 0.8 }}>No runs found.</div>
      )}
    </div>
  )
}

const card: React.CSSProperties = {
  border: "1px solid #222",
  borderRadius: 14,
  padding: 14,
  background: "#0e0e16"
}

const link: React.CSSProperties = {
  color: "#cfd3ff",
  textDecoration: "none",
  border: "1px solid #2b2b38",
  padding: "8px 10px",
  borderRadius: 12,
  background: "#141426",
  fontWeight: 700,
  fontSize: 12
}