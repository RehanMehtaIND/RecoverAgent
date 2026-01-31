import { openaiResponses } from "./openai"
import { buildBundle } from "./bundle"
import { applyPatch, diffStat } from "./patch"
import { runVerify } from "./verify"
import { makeTempDir, cloneAtSha, configureUser, createBranch, commitAll, pushBranch } from "./git"
import { ghFetch } from "./github"

function plannerInput(bundle: string) {
  return [
    { role: "system", content: "You are a senior software engineer acting as a CI repair planner." },
    {
      role: "user",
      content:
`Input:
${bundle}

Output JSON ONLY with keys:
{
  "summary": string,
  "root_cause_hypotheses": [{"cause": string, "evidence": string}],
  "fix_plan": [{"step": string, "files": [string]}],
  "patch_constraints": {
    "max_files_touched": number,
    "avoid": [string],
    "must": [string]
  },
  "verification": [{"command": string, "why": string}]
}

Rules:
- Prefer smallest change that makes tests pass.
- Do not change public APIs unless logs clearly demand it.
- Never disable or skip tests.
- Keep max_files_touched <= 5.`
    }
  ]
}

function patcherInput(bundle: string, planJson: string) {
  return [
    { role: "system", content: "You are an automated patch generator." },
    {
      role: "user",
      content:
`Planner JSON:
${planJson}

Context:
${bundle}

Return ONLY a valid unified diff patch that can be applied with git apply.
No explanation. No markdown.

Rules:
- Touch at most the planner's max_files_touched files.
- Never disable or skip tests.
- Keep style consistent with repo.
- Patch must directly address evidence in logs.`
    }
  ]
}

function prBodyInput(bundle: string, planJson: string, stat: string, verifyLog: string) {
  return [
    { role: "system", content: "You are writing a PR description for an automated CI fix." },
    {
      role: "user",
      content:
`Context:
${bundle}

Planner JSON:
${planJson}

Diff stat:
${stat}

Verification output:
${verifyLog}

Write:
- What failed
- Root cause (with evidence from logs)
- What changed
- How verified (commands + results)
- Risks and rollback

Be crisp and technical.`
    }
  ]
}

function safeJson(s: string) {
  try { return JSON.parse(s) } catch { return null }
}

export async function runHealJob(args: {
  apiKey: string
  model: string
  githubToken: string
  owner: string
  repo: string
  base: string
  runId: number
  headSha: string
  logText: string
  verifyCmd: string
  onLog: (s: string) => void
}) {
  const { apiKey, model, githubToken, owner, repo, runId, headSha, logText, verifyCmd, onLog, base } = args

  onLog("Creating sandbox checkout")
  const dir = makeTempDir()
  const repoUrl = `https://github.com/${owner}/${repo}.git`
  cloneAtSha(repoUrl, headSha, dir)
  configureUser(dir)

  onLog("Building context bundle")
  const { bundle } = buildBundle(dir, logText)

  onLog("Planning fix")
  const planRaw = await openaiResponses(apiKey, model, plannerInput(bundle), 0.2)
  const plan = safeJson(planRaw)
  if (!plan) throw new Error("Planner returned invalid JSON")

  onLog("Generating patch (unified diff)")
  const patchRaw = await openaiResponses(apiKey, model, patcherInput(bundle, JSON.stringify(plan)), 0.1)

  const branch = `selfheal/run-${runId}-${headSha.slice(0, 8)}`
  onLog(`Creating branch ${branch}`)
  createBranch(dir, branch)

  onLog("Applying patch")
  applyPatch(dir, patchRaw)

  onLog(`Verifying: ${verifyCmd}`)
  const verifyLog = runVerify(dir, verifyCmd)

  onLog("Committing changes")
  const stat = diffStat(dir)
  commitAll(dir, `Self-heal: CI fix for run ${runId}`)

  onLog("Pushing branch")
  pushBranch(dir, githubToken, owner, repo, branch)

  onLog("Writing PR body")
  const prBody = await openaiResponses(apiKey, model, prBodyInput(bundle, JSON.stringify(plan), stat, verifyLog), 0.2)

  onLog("Opening PR")
  const pr = await ghFetch(githubToken, `https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Self-heal: CI fix for run ${runId}`,
      head: branch,
      base,
      body: prBody
    })
  })

  return { prUrl: pr.html_url as string }
}