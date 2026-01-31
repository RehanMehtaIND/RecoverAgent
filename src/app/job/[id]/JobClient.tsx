"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"

type Job = {
  id: string
  status: string
  step: string
  prUrl?: string
  error?: string
  logs?: string[]
  retries?: number
  diffStat?: string
  verifyLog?: string
  patchPreview?: string
  prBody?: string
}

export default function JobClient() {
  const routeParams = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)
  const search = useMemo(
    () => new URLSearchParams(isMounted ? (searchParams?.toString() || "") : ""),
    [isMounted, searchParams]
  )
  const jobIdParam = routeParams?.id
  const jobId = Array.isArray(jobIdParam) ? jobIdParam[0] : jobIdParam || ""

  const owner = search.get("owner") || ""
  const repo = search.get("repo") || ""
  const base = search.get("base") || "main"
  const token = search.get("token") || ""
  const model = search.get("model") || "gpt-4.1-mini"
  const temperature = search.get("temperature") || "0.2"

  const [job, setJob] = useState<Job | null>(null)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    let t: any
    const poll = async () => {
      const r = await fetch(`/api/heal/status?jobId=${encodeURIComponent(jobId)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&base=${encodeURIComponent(base)}&token=${encodeURIComponent(token)}`)
      const j = await r.json()
      if (r.ok) {
        setJob(prev => {
          const next = j.job as Job
          if (prev?.status !== "done" && next?.status === "done") {
            setShowToast(true)
          }
          return next
        })
      }
      const done = j?.job?.status === "done" || j?.job?.status === "error"
      if (!done) t = setTimeout(poll, 1200)
    }
    if (isMounted && jobId) poll()
    return () => clearTimeout(t)
  }, [isMounted, jobId, owner, repo, base, token])

  useEffect(() => {
    if (!showToast) return
    const t = setTimeout(() => setShowToast(false), 3500)
    return () => clearTimeout(t)
  }, [showToast])

  const backParams = new URLSearchParams({ owner, repo, base, token, model, temperature })

  const clearHistory = () => {
    if (!job) return
    setJob({
      ...job,
      logs: job.logs ? [job.logs[job.logs.length - 1] || ""] : []
    })
  }

  return (
    <div style={page}>
      {showToast && (
        <div style={toast}>
          PR created — ready for review
        </div>
      )}
      <div style={header}>
        <div>
          <div style={title}>Job {jobId}</div>
          <div style={subtitle}>Model: {model} · Temperature: {Number(temperature).toFixed(2)}</div>
        </div>
        <a href={`/runs?${backParams.toString()}`} style={backLink}>back</a>
      </div>

      {!job && <div style={muted}>Loading…</div>}

      {job && (
        <>
          <div style={summaryCard}>
            <div style={statusRow}>
              <span style={{ ...badge, ...(job.status === "done" ? badgeOk : job.status === "error" ? badgeErr : badgeRun) }}>
                {job.status}
              </span>
              <span style={pill}>{job.step}</span>
              {typeof job.retries === "number" && (
                <span style={pill}>retries: {job.retries}</span>
              )}
            </div>

            {job.prUrl && (
              <div>
                PR: <a href={job.prUrl} target="_blank" style={link}>{job.prUrl}</a>
              </div>
            )}

            {job.error && <div style={error}>{job.error}</div>}
            {(job.logs && job.logs.length > 0) && (
              <div style={latest}>
                Latest: {job.logs[job.logs.length - 1]}
              </div>
            )}

            <div style={actions}>
              <a href={`/api/heal/debug?jobId=${encodeURIComponent(jobId)}`} style={ghostBtn}>Download debug bundle</a>
              <button onClick={clearHistory} style={ghostBtn} type="button">Clear history</button>
            </div>
          </div>

          <div style={grid}>
            <section style={card}>
              <div style={sectionTitle}>PR Summary</div>
              {job.diffStat && <pre style={pre}>{job.diffStat}</pre>}
              {job.prBody && (
                <details style={details}>
                  <summary>PR description</summary>
                  <pre style={pre}>{job.prBody}</pre>
                </details>
              )}
              {!job.diffStat && !job.prBody && <div style={muted}>PR summary will appear after verification.</div>}
            </section>

            <section style={card}>
              <div style={sectionTitle}>Verification</div>
              {job.verifyLog ? <pre style={pre}>{job.verifyLog}</pre> : <div style={muted}>Waiting on verification output…</div>}
            </section>

            <section style={card}>
              <div style={sectionTitle}>Patch Preview</div>
              {job.patchPreview ? (
                <details style={details}>
                  <summary>View patch</summary>
                  <pre style={pre}>{job.patchPreview}</pre>
                </details>
              ) : (
                <div style={muted}>Patch preview will appear after generation.</div>
              )}
            </section>
          </div>

          <div style={timeline}>
            <details style={details}>
              <summary>View full timeline</summary>
              <div style={logGrid}>
                {(job.logs || []).map((x, i) => (
                  <div key={i} style={logLine}>{x}</div>
                ))}
              </div>
            </details>
          </div>
        </>
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
  opacity: 0.7,
  fontSize: 12
}

const backLink: React.CSSProperties = {
  color: "#cfd3ff",
  textDecoration: "none",
  fontWeight: 600
}

const summaryCard: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(12, 12, 18, 0.7)",
  display: "grid",
  gap: 10
}

const statusRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap"
}

const badge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "capitalize"
}

const badgeOk: React.CSSProperties = {
  background: "rgba(80, 200, 140, 0.2)",
  color: "#9ef0c2",
  border: "1px solid rgba(80, 200, 140, 0.4)"
}

const badgeErr: React.CSSProperties = {
  background: "rgba(255, 120, 120, 0.18)",
  color: "#ffb5b5",
  border: "1px solid rgba(255, 120, 120, 0.4)"
}

const badgeRun: React.CSSProperties = {
  background: "rgba(140, 170, 255, 0.18)",
  color: "#c8d6ff",
  border: "1px solid rgba(140, 170, 255, 0.4)"
}

const pill: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)"
}

const actions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
}

const ghostBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "transparent",
  color: "#f2f2f2",
  textDecoration: "none"
}

const link: React.CSSProperties = {
  color: "#cfd3ff",
  textDecoration: "none"
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: 12
}

const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(12, 12, 18, 0.7)",
  display: "grid",
  gap: 8
}

const sectionTitle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: 6
}

const details: React.CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
  paddingTop: 8
}

const pre: React.CSSProperties = {
  margin: 0,
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(8, 8, 12, 0.8)",
  overflowX: "auto",
  maxHeight: 360,
  whiteSpace: "pre-wrap",
  fontSize: 12
}

const timeline: React.CSSProperties = {
  display: "grid",
  gap: 8
}

const logGrid: React.CSSProperties = {
  display: "grid",
  gap: 8
}

const logLine: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(8, 8, 12, 0.7)",
  fontSize: 12,
  opacity: 0.95
}

const muted: React.CSSProperties = {
  opacity: 0.7
}

const error: React.CSSProperties = {
  color: "#ff9a9a"
}

const latest: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.8,
  borderTop: "1px solid rgba(255,255,255,0.06)",
  paddingTop: 8
}

const toast: React.CSSProperties = {
  position: "fixed",
  right: 24,
  top: 24,
  padding: "12px 16px",
  borderRadius: 12,
  background: "rgba(80, 200, 140, 0.18)",
  border: "1px solid rgba(80, 200, 140, 0.4)",
  color: "#b9f2d4",
  fontWeight: 700,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  zIndex: 30
}
