type Job = {
  id: string
  status: "queued" | "running" | "done" | "error"
  step: string
  logs: string[]
  prUrl?: string
  error?: string
  createdAt: number
  retries?: number
  diffStat?: string
  verifyLog?: string
  patchPreview?: string
  prBody?: string
  bundle?: string
  bundleFiles?: string[]
}

const g = globalThis as any
g.__selfhealJobs = g.__selfhealJobs || new Map<string, Job>()
const jobs: Map<string, Job> = g.__selfhealJobs

export function createJob(): Job {
  const id = Math.random().toString(16).slice(2) + Date.now().toString(16)
  const job: Job = { id, status: "queued", step: "queued", logs: [], createdAt: Date.now(), retries: 0 }
  jobs.set(id, job)
  return job
}

export function getJob(id: string) {
  return jobs.get(id) || null
}

export function setJob(id: string, patch: Partial<Job>) {
  const j = jobs.get(id)
  if (!j) return null
  const next = { ...j, ...patch }
  jobs.set(id, next)
  return next
}

export function pushLog(id: string, line: string) {
  const j = jobs.get(id)
  if (!j) return null
  j.logs.push(`${new Date().toLocaleTimeString()} · ${line}`)
  jobs.set(id, j)
  return j
}
