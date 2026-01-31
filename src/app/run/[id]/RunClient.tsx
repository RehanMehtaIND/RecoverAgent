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
      body: JSON.stringify({ owner, repo, base, token, runId: Number(runId) })
    })
    const j = await r.json()
    setStarting(false)
    if (!r.ok) {
      alert(j?.error || "Failed to start")
      return
    }
    window.location.href = `/job/${j.jobId}?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&base=${encodeURIComponent(base)}&token=${encodeURIComponent(token)}`
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Run {runId}</h1>
        <a href={`/runs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&base=${encodeURIComponent(base)}&token=${encodeURIComponent(token)}`} style={{ color: "#aab" }}>back</a>
      </div>

      {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
      {err && <div style={{ color: "#ff9a9a" }}>{err}</div>}

      {meta && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>{meta.name || "workflow"}</div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>
                {meta.status} · {meta.conclusion || "—"} · sha {String(meta.head_sha || "").slice(0, 8)}
              </div>
            </div>

            <button onClick={startHeal} disabled={starting} style={btn}>
              {starting ? "Starting…" : "Heal"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ opacity: 0.85, fontWeight: 700 }}>Logs (tail)</div>
        <pre style={pre}>{log || "No logs loaded."}</pre>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  border: "1px solid #222",
  borderRadius: 14,
  padding: 14,
  background: "#0e0e16"
}

const pre: React.CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 14,
  border: "1px solid #222",
  background: "#0a0a12",
  overflowX: "auto",
  maxHeight: 420,
  whiteSpace: "pre-wrap"
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #2b2b38",
  background: "#1c1c2a",
  color: "#f2f2f2",
  fontWeight: 800,
  cursor: "pointer"
}
