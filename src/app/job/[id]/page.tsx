"use client"

import { useEffect, useMemo, useState } from "react"

type Job = {
  id: string
  status: string
  step: string
  prUrl?: string
  error?: string
  logs?: string[]
}

export default function JobPage({ params }: { params: { id: string } }) {
  const search = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), [])
  const owner = search.get("owner") || ""
  const repo = search.get("repo") || ""
  const base = search.get("base") || "main"
  const token = search.get("token") || ""

  const [job, setJob] = useState<Job | null>(null)

  useEffect(() => {
    let t: any
    const poll = async () => {
      const r = await fetch(`/api/heal/status?jobId=${encodeURIComponent(params.id)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&base=${encodeURIComponent(base)}&token=${encodeURIComponent(token)}`)
      const j = await r.json()
      if (r.ok) setJob(j.job)
      const done = j?.job?.status === "done" || j?.job?.status === "error"
      if (!done) t = setTimeout(poll, 1200)
    }
    poll()
    return () => clearTimeout(t)
  }, [params.id, owner, repo, base, token])

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Job {params.id}</h1>
        <a href={`/runs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&base=${encodeURIComponent(base)}&token=${encodeURIComponent(token)}`} style={{ color: "#aab" }}>back</a>
      </div>

      {!job && <div style={{ opacity: 0.8 }}>Loading…</div>}

      {job && (
        <>
          <div style={card}>
            <div style={{ display: "grid", gap: 6 }}>
              <div>Status: <b>{job.status}</b></div>
              <div>Step: <b>{job.step}</b></div>
              {job.prUrl && (
                <div>
                  PR: <a href={job.prUrl} target="_blank" style={{ color: "#cfd3ff" }}>{job.prUrl}</a>
                </div>
              )}
              {job.error && <div style={{ color: "#ff9a9a" }}>{job.error}</div>}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ opacity: 0.85, fontWeight: 700 }}>Timeline</div>
            <div style={{ display: "grid", gap: 8 }}>
              {(job.logs || []).map((x, i) => (
                <div key={i} style={logLine}>{x}</div>
              ))}
            </div>
          </div>
        </>
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

const logLine: React.CSSProperties = {
  border: "1px solid #222",
  borderRadius: 12,
  padding: 10,
  background: "#0a0a12",
  fontSize: 12,
  opacity: 0.95
}