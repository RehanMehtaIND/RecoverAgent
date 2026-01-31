import { NextResponse } from "next/server"
import { createJob, pushLog, setJob } from "@/lib/store"
import { getRun, downloadRunLogs } from "@/lib/github"
import { runHealJob } from "@/lib/healer"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const owner = body.owner || process.env.GITHUB_OWNER || ""
  const repo = body.repo || process.env.GITHUB_REPO || ""
  const base = body.base || process.env.GITHUB_BASE || "main"
  const token = body.token || process.env.GITHUB_TOKEN || ""
  const runId = Number(body.runId || 0)

  const apiKey = process.env.OPENAI_API_KEY || ""
  const model = body.model || process.env.OPENAI_MODEL || "gpt-4.1-mini"
  const temperatureRaw = body.temperature ?? process.env.OPENAI_TEMPERATURE ?? 0.2
  const temperature = Math.max(0, Math.min(1, Number(temperatureRaw) || 0.2))
  const verifyCmd = process.env.VERIFY_CMD || "npm test"
  const maxRateRetries = Number(process.env.HEAL_RATE_RETRIES || 2)
  const retryDelayMs = Number(process.env.HEAL_RATE_RETRY_MS || 25000)

  if (!owner || !repo) return NextResponse.json({ error: "Missing owner/repo" }, { status: 400 })
  if (!token) return NextResponse.json({ error: "Missing GitHub token" }, { status: 400 })
  if (!apiKey) return NextResponse.json({ error: "Missing OpenAI key" }, { status: 400 })
  if (!runId) return NextResponse.json({ error: "Missing runId" }, { status: 400 })

  const job = createJob()

  setJob(job.id, { status: "running", step: "fetching run" })
  pushLog(job.id, "Fetching run metadata")

  const attemptHeal = async (attempt: number) => {
    try {
      setJob(job.id, { retries: attempt })
      const run = await getRun(token, owner, repo, runId)
      const sha = String(run.head_sha || "")
      setJob(job.id, { step: "fetching logs" })
      pushLog(job.id, "Downloading run logs")
      const buf = await downloadRunLogs(token, owner, repo, runId)
      const logText = buf.toString("utf8").slice(-80000)

      setJob(job.id, { step: "healing" })
      pushLog(job.id, "Starting heal engine")

      const res = await runHealJob({
        apiKey,
        model,
        temperature,
        githubToken: token,
        owner,
        repo,
        base,
        runId,
        headSha: sha,
        logText,
        verifyCmd,
        onLog: (s) => {
          pushLog(job.id, s)
          setJob(job.id, { step: s })
        }
      })

      setJob(job.id, {
        status: "done",
        step: "done",
        prUrl: res.prUrl,
        diffStat: res.diffStat,
        verifyLog: res.verifyLog,
        patchPreview: res.patchPreview,
        prBody: res.prBody,
        bundle: res.bundle,
        bundleFiles: res.bundleFiles
      })
      pushLog(job.id, "Done")
    } catch (e: any) {
      const msg = e?.message || "Failed"
      const isRateLimit = /rate limit/i.test(String(msg))
      if (isRateLimit && attempt < maxRateRetries) {
        setJob(job.id, { status: "queued", step: "rate limited" })
        pushLog(job.id, `Rate limited. Retrying in ${Math.round(retryDelayMs / 1000)}s (attempt ${attempt + 1}/${maxRateRetries}).`)
        setTimeout(() => attemptHeal(attempt + 1), retryDelayMs)
        return
      }
      setJob(job.id, { status: "error", step: "error", error: msg })
      pushLog(job.id, `Error: ${msg}`)
    }
  }

  ;(async () => {
    await attemptHeal(0)
  })()

  return NextResponse.json({ jobId: job.id })
}
