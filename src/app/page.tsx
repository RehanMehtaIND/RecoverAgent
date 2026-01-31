"use client"

import { useState } from "react"

export default function Home() {
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [token, setToken] = useState("")
  const [base, setBase] = useState("main")

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Connect Repo</h1>
      <div style={{ opacity: 0.85, lineHeight: 1.4 }}>
        Enter repo details. Token can be left blank if set via server env.
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" style={inp} />
        <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="repo" style={inp} />
        <input value={base} onChange={e => setBase(e.target.value)} placeholder="base branch (e.g. main)" style={inp} />
        <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="GitHub token (optional)" style={inp} />
      </div>

      <a
        href={`/runs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&base=${encodeURIComponent(base)}&token=${encodeURIComponent(token)}`}
        style={btn}
      >
        View Runs
      </a>

      <div style={{ opacity: 0.75, fontSize: 12 }}>
        Tip: For hackathon demo, create a fine-grained token with repo + PR permissions.
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #2b2b38",
  background: "#0e0e16",
  color: "#f2f2f2",
  outline: "none"
}

const btn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #2b2b38",
  background: "#1c1c2a",
  color: "#f2f2f2",
  textDecoration: "none",
  fontWeight: 700,
  width: "fit-content"
}
