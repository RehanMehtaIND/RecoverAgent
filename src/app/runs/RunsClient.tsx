"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

type Run = {
  id: number
  name: string
  status: string
  conclusion: string | null
  html_url: string
  head_sha: string
  created_at: string
}

export default function RunsClient() {
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)
  const params = useMemo(
    () => new URLSearchParams(isMounted ? (searchParams?.toString() || "") : ""),
    [isMounted, searchParams]
  )
  const owner = params.get("owner") || ""
  const repo = params.get("repo") || ""
  const base = params.get("base") || "main"
  const token = params.get("token") || ""
  const model = params.get("model") || "gpt-4.1-mini"
  const temperature = params.get("temperature") || "0.2"

  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
    if (isMounted && owner && repo) go()
  }, [isMounted, owner, repo, token])

  const baseParams = new URLSearchParams({
    owner,
    repo,
    base,
    token,
    model,
    temperature
  }).toString()

  const homeParams = new URLSearchParams({ owner, repo, base, token, model, temperature }).toString()

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <div style={title}>Workflow Runs</div>
          <div style={subtitle}>Repo: <b>{owner}/{repo}</b> · Base: <b>{base}</b></div>
        </div>
        <a href={`/?${homeParams}`} style={backLink}>back</a>
      </div>

      <div style={metaRow}>
        <div style={chip}>Model: {model}</div>
        <div style={chip}>Temperature: {Number(temperature).toFixed(2)}</div>
      </div>

      {loading && <div style={muted}>Loading…</div>}
      {err && <div style={error}>{err}</div>}

      <div style={grid}>
        {runs.map(run => (
          <div key={run.id} style={card}>
            <div style={cardTop}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={cardTitle}>{run.name || "workflow"}</div>
                <div style={cardMeta}>
                  {run.status} · {run.conclusion || "—"} · {new Date(run.created_at).toLocaleString()}
                </div>
                <div style={cardMeta}>sha: {run.head_sha.slice(0, 8)}</div>
              </div>
              <div style={cardActions}>
                <a href={run.html_url} target="_blank" style={link}>open</a>
                <a
                  href={`/run/${run.id}?${baseParams}`}
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
        <div style={muted}>No runs found.</div>
      )}
    </div>
  )
}

const page: React.CSSProperties = {
  display: "grid",
  gap: 16
}

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
}

const title: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700
}

const subtitle: React.CSSProperties = {
  opacity: 0.75
}

const backLink: React.CSSProperties = {
  color: "#cfd3ff",
  textDecoration: "none",
  fontWeight: 600
}

const metaRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
}

const chip: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  fontSize: 12
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: 12
}

const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(12, 12, 18, 0.7)"
}

const cardTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
}

const cardTitle: React.CSSProperties = {
  fontWeight: 700
}

const cardMeta: React.CSSProperties = {
  opacity: 0.7,
  fontSize: 12
}

const cardActions: React.CSSProperties = {
  display: "grid",
  gap: 8,
  justifyItems: "end"
}

const link: React.CSSProperties = {
  color: "#f5f6f8",
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.2)",
  padding: "8px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.08)",
  fontWeight: 600,
  fontSize: 12
}

const muted: React.CSSProperties = {
  opacity: 0.7
}

const error: React.CSSProperties = {
  color: "#ff9a9a"
}
