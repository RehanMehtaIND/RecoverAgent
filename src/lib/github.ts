export async function ghFetch(token: string, url: string, init?: RequestInit) {
  const r = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  })
  const text = await r.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  if (!r.ok) throw new Error(json?.message || `GitHub error ${r.status}`)
  return json
}

export async function listRuns(token: string, owner: string, repo: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=15`
  const j = await ghFetch(token, url)
  return j.workflow_runs || []
}

export async function getRun(token: string, owner: string, repo: string, runId: number) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`
  return await ghFetch(token, url)
}

export async function downloadRunLogs(token: string, owner: string, repo: string, runId: number) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`
  const r = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`GitHub logs error ${r.status}: ${t}`)
  }
  const buf = Buffer.from(await r.arrayBuffer())
  return buf
}