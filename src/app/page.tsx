"use client"

import { useEffect, useMemo, useState } from "react"

type Preset = {
  name: string
  owner: string
  repo: string
  base: string
  token: string
  model: string
  temperature: number
}

const DEFAULT_MODEL = "gpt-4.1-mini"

export default function Home() {
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [token, setToken] = useState("")
  const [base, setBase] = useState("main")
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [temperature, setTemperature] = useState(0.2)
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState("")
  const temperatureEnabled = !model.startsWith("o")

  useEffect(() => {
    const raw = localStorage.getItem("selfheal_presets")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setPresets(parsed)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qOwner = params.get("owner") || ""
    const qRepo = params.get("repo") || ""
    const qBase = params.get("base") || ""
    const qToken = params.get("token") || ""
    const qModel = params.get("model") || ""
    const qTemp = params.get("temperature") || ""
    if (qOwner) setOwner(qOwner)
    if (qRepo) setRepo(qRepo)
    if (qBase) setBase(qBase)
    if (qToken) setToken(qToken)
    if (qModel) setModel(qModel)
    if (qTemp) setTemperature(Number(qTemp) || 0.2)
  }, [])

  useEffect(() => {
    localStorage.setItem("selfheal_presets", JSON.stringify(presets))
  }, [presets])

  const canSave = owner && repo

  const viewRunsHref = useMemo(() => {
    const q = new URLSearchParams({
      owner,
      repo,
      base,
      token,
      model,
      temperature: String(temperature)
    })
    return `/runs?${q.toString()}`
  }, [owner, repo, base, token, model, temperature])

  const onLoadPreset = () => {
    const p = presets.find(x => x.name === selectedPreset)
    if (!p) return
    setOwner(p.owner)
    setRepo(p.repo)
    setBase(p.base)
    setToken(p.token)
    setModel(p.model)
    setTemperature(p.temperature)
  }

  const onSavePreset = () => {
    if (!canSave) return
    const name = `${owner}/${repo}`
    const next: Preset = { name, owner, repo, base, token, model, temperature }
    const filtered = presets.filter(p => p.name !== name)
    setPresets([next, ...filtered].slice(0, 6))
    setSelectedPreset(name)
  }

  return (
    <div style={page}>
      <div style={hero}>
        <div style={heroBadge}>Agentic CI Fix</div>
        <h1 style={heroTitle}>Self‑heal your failing runs with confidence.</h1>
        <p style={heroSub}>
          Point us to a repo and we’ll trace the failing run, draft a fix, verify it, and open a PR.
        </p>
      </div>

      <div style={grid}>
        <section style={card}>
          <div style={cardTitle}>Repository</div>
          <div style={cardSub}>Connect your repo and pick the base branch.</div>
          <div style={formGrid}>
            <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" style={inp} />
            <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="repo" style={inp} />
            <input value={base} onChange={e => setBase(e.target.value)} placeholder="base branch (e.g. main)" style={inp} />
            <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="GitHub token (optional)" style={inp} />
          </div>

          <div style={presetRow}>
            <select value={selectedPreset} onChange={e => setSelectedPreset(e.target.value)} style={select}>
              <option value="">Load preset…</option>
              {presets.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <button onClick={onLoadPreset} style={ghostBtn} disabled={!selectedPreset}>Load</button>
            <button onClick={onSavePreset} style={ghostBtn} disabled={!canSave}>Save preset</button>
          </div>
        </section>

        <section style={card}>
          <div style={cardTitle}>Model & Verification</div>
          <div style={cardSub}>Using the stable model: {DEFAULT_MODEL}.</div>

          <div style={row}>
            <label style={label}>Temperature</label>
            <div style={{ display: "grid", gap: 6 }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
                style={range}
                disabled={!temperatureEnabled}
              />
              <div style={rangeLabel}>{temperature.toFixed(2)}</div>
            </div>
          </div>

          <div style={hint}>
            {temperatureEnabled
              ? "Tip: lower temperature improves patch reliability."
              : "Temperature is ignored for o‑series models."}
          </div>
        </section>

        <section style={cardWide}>
          <div style={cardTitle}>Launch</div>
          <div style={cardSub}>We’ll fetch runs and let you pick a failure to heal.</div>
          <a href={viewRunsHref} style={primaryBtn}>View Runs</a>
          <div style={finePrint}>
            Token is kept locally for this session; leave it blank if the server has GITHUB_TOKEN.
          </div>
        </section>
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  display: "grid",
  gap: 20
}

const hero: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "8px 4px"
}

const heroBadge: React.CSSProperties = {
  alignSelf: "start",
  fontSize: 12,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  width: "fit-content"
}

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.1
}

const heroSub: React.CSSProperties = {
  margin: 0,
  opacity: 0.82,
  maxWidth: 720
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: 14
}

const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  padding: 16,
  background: "rgba(8, 8, 12, 0.6)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
}

const cardWide: React.CSSProperties = {
  ...card,
  display: "grid",
  gap: 10,
  justifyItems: "start"
}

const cardTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700
}

const cardSub: React.CSSProperties = {
  opacity: 0.75,
  marginBottom: 10
}

const formGrid: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "1fr 1fr"
}

const row: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginBottom: 10
}

const label: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7
}

const inp: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(12, 12, 18, 0.9)",
  color: "#f2f2f2",
  outline: "none"
}

const select: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(12, 12, 18, 0.9)",
  color: "#f2f2f2",
  outline: "none"
}

const range: React.CSSProperties = {
  width: "100%"
}

const rangeLabel: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7
}

const presetRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginTop: 12,
  flexWrap: "wrap"
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "linear-gradient(135deg, rgba(125, 232, 255, 0.2), rgba(128, 149, 255, 0.2))",
  color: "#f2f2f2",
  textDecoration: "none",
  fontWeight: 700
}

const ghostBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "transparent",
  color: "#f2f2f2",
  cursor: "pointer"
}

const hint: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.65
}

const finePrint: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.65
}
