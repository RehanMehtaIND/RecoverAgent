"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"

export default function RunClient() {
  const routeParams = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)
  const search = useMemo(
    () => new URLSearchParams(isMounted ? (searchParams?.toString() || "") : ""),
    [isMounted, searchParams]
  )
  const runIdParam = routeParams?.id
  const runId = Array.isArray(runIdParam) ? runIdParam[0] : runIdParam || ""
  const owner = search.get("owner") || ""
  const repo = search.get("repo") || ""
  const base = search.get("base") || "main"
  const token = search.get("token") || ""
  const model = search.get("model") || "gpt-4.1-mini"
  const temperature = Number(search.get("temperature") || 0.2)

  const [log, setLog] = useState("")
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const go = async () => {
      setLoading(true)
      setErr("")
      const r = await fetch(`/api/run?id=${encodeURIComponent(runId)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&token=${encodeURIComponent(token)}`)
      const j = await r.json()
      if (!r.ok) {
        setErr(j?.error || "Failed")
        setMeta(null)
        setLog("")
      } else {
        setMeta(j.run)
        setLog(j.log || "")
      }
      setLoading(false)
    }
    if (isMounted && owner && repo) go()
  }, [isMounted, runId, owner, repo, token])

  const startHeal = async () => {
    setStarting(true)
    const r = await fetch("/api/heal/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, base, token, runId: Number(runId), model, temperature })
    })
    const j = await r.json()
    setStarting(false)
    if (!r.ok) {
      alert(j?.error || "Failed to start")
      return
    }
    const q = new URLSearchParams({ owner, repo, base, token, model, temperature: String(temperature) })
    window.location.href = `/job/${j.jobId}?${q.toString()}`
  }

  const backParams = new URLSearchParams({ owner, repo, base, token, model, temperature: String(temperature) })

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <div style={title}>Run {runId}</div>
          <div style={subtitle}>Model: {model} · Temperature: {temperature.toFixed(2)}</div>
        </div>
        <a href={`/runs?${backParams.toString()}`} style={backLink}>back</a>
      </div>

      {loading && <div style={muted}>Loading…</div>}
      {err && <div style={error}>{err}</div>}

      {meta && (
        <div style={card}>
          <div style={cardTop}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={cardTitle}>{meta.name || "workflow"}</div>
              <div style={cardMeta}>
                {meta.status} · {meta.conclusion || "—"} · sha {String(meta.head_sha || "").slice(0, 8)}
              </div>
            </div>

            <button onClick={startHeal} disabled={starting} style={btn}>
              {starting ? "Starting…" : "Heal"}
            </button>
          </div>
        </div>
      )}

      <div style={logPanel}>
        <div style={logTitle}>Logs (tail)</div>
        <pre style={pre}>{log || "No logs loaded."}</pre>
      </div>
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
  opacity: 0.7,
  fontSize: 12
}

const backLink: React.CSSProperties = {
  color: "#cfd3ff",
  textDecoration: "none",
  fontWeight: 600
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

const logPanel: React.CSSProperties = {
  display: "grid",
  gap: 8
}

const logTitle: React.CSSProperties = {
  opacity: 0.85,
  fontWeight: 700
}

const pre: React.CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(8, 8, 12, 0.7)",
  overflowX: "auto",
  maxHeight: 420,
  whiteSpace: "pre-wrap"
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.12)",
  color: "#f2f2f2",
  fontWeight: 700,
  cursor: "pointer"
}

const muted: React.CSSProperties = {
  opacity: 0.7
}

const error: React.CSSProperties = {
  color: "#ff9a9a"
}
