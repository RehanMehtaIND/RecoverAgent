import fs from "node:fs"
import path from "node:path"
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

function patcherInput(bundle: string, planJson: string, allowedFiles: string[]) {
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
- Only modify files that appear in this allowed list:
${allowedFiles.join("\n")}
- Never disable or skip tests.
- Keep style consistent with repo.
- Patch must directly address evidence in logs.
- Preserve original line breaks and formatting; do not compress multiple statements onto one line.`
    }
  ]
}

function patcherRetryInput(
  bundle: string,
  planJson: string,
  allowedFiles: string[],
  errorText: string,
  extraContext: string
) {
  return [
    {
      role: "system",
      content:
        "You are an automated patch generator. Your previous output was invalid. Return ONLY a valid unified diff with diff --git, ---/+++ headers, and @@ hunks. No explanation."
    },
    {
      role: "user",
      content:
`Planner JSON:
${planJson}

Context:
${bundle}

Previous apply error:
${errorText}

${extraContext}

Return ONLY a valid unified diff patch that can be applied with git apply.
No explanation. No markdown.

Rules:
- Only modify files from this allowed list:
${allowedFiles.join("\n")}
- Use exact context from the files shown in the bundle. Do not invent lines.`
    }
  ]
}

function fileRewriteInput(
  bundle: string,
  planJson: string,
  allowedFiles: string[],
  errorText: string,
  extraContext: string
) {
  return [
    {
      role: "system",
      content:
        "You are an automated patch generator. Unified diff failed. Return ONLY JSON with full file contents."
    },
    {
      role: "user",
      content:
`Planner JSON:
${planJson}

Context:
${bundle}

Previous apply error:
${errorText}

${extraContext}

Return ONLY valid JSON:
{
  "files": [
    { "path": "relative/path/from/repo", "content": "full file content" }
  ]
}

Rules:
- Only include files from this allowed list:
${allowedFiles.join("\n")}
- You MUST include at least one file in the response.
- Use exact content style from the repo (line breaks, indentation).
- Do not add commentary or markdown.`
    }
  ]
}

function fileRewriteStrictInput(
  bundle: string,
  planJson: string,
  allowedFiles: string[],
  errorText: string,
  extraContext: string
) {
  return [
    {
      role: "system",
      content:
        "You are an automated patch generator. You MUST return a non-empty file rewrite payload."
    },
    {
      role: "user",
      content:
`Planner JSON:
${planJson}

Context:
${bundle}

Previous apply error:
${errorText}

${extraContext}

Return ONLY valid JSON with at least one file:
{
  "files": [
    { "path": "relative/path/from/repo", "content": "full file content" }
  ]
}

Rules:
- Only include files from this allowed list:
${allowedFiles.join("\n")}
- Use exact content style from the repo (line breaks, indentation).
- Do not add commentary or markdown.`
    }
  ]
}

function isLikelyUnifiedDiff(text: string) {
  const t = text.trim()
  if (!t) return false
  const hasFileHeader = /^(diff --git |---\s+\S+)/m.test(t)
  const hasPlusHeader = /^\+\+\+\s+\S+/m.test(t)
  const hasHunk = /^@@/m.test(t)
  return hasFileHeader && hasPlusHeader && hasHunk
}

function applyFileRewrites(cwd: string, files: { path: string; content: string }[], allowed: Set<string>) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("File rewrite payload is empty.")
  }
  for (const file of files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("Invalid file rewrite entry.")
    }
    if (!allowed.has(file.path)) {
      throw new Error(`File rewrite path not allowed: ${file.path}`)
    }
    const abs = path.join(cwd, file.path)
    if (!fs.existsSync(abs)) {
      throw new Error(`File not found for rewrite: ${file.path}`)
    }
    fs.writeFileSync(abs, file.content)
  }
}

function extractSnippetFromError(cwd: string, errorText: string) {
  const pattern = /([A-Za-z0-9_./-]+\.(?:html|js|ts|tsx|jsx|css|scss|json|md|txt|py|go|java|rb|php)):(\d+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(errorText)) !== null) {
    const filePath = match[1]
    if (filePath.endsWith(".selfheal.patch")) continue
    const line = Number(match[2])
    if (!Number.isFinite(line) || line <= 0) continue
    const abs = path.join(cwd, filePath)
    if (!fs.existsSync(abs)) continue
    const lines = fs.readFileSync(abs, "utf8").split("\n")
    const start = Math.max(1, line - 15)
    const end = Math.min(lines.length, line + 15)
    const snippet = lines
      .slice(start - 1, end)
      .map((l, i) => `${start + i}: ${l}`)
      .join("\n")
    return `FILE_SNIPPET (${filePath} lines ${start}-${end}):\n${snippet}`
  }
  return "FILE_SNIPPET: unavailable"
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
  temperature: number
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
  const { apiKey, model, temperature, githubToken, owner, repo, runId, headSha, logText, verifyCmd, onLog, base } = args
  const clip = (s: string, max = 8000) => (s.length > max ? `${s.slice(0, max)}\n...[truncated]` : s)

  onLog("Creating sandbox checkout")
  const dir = makeTempDir()
  const repoUrl = `https://github.com/${owner}/${repo}.git`
  cloneAtSha(repoUrl, headSha, dir)
  configureUser(dir)

  onLog("Building context bundle")
  const { bundle, files } = buildBundle(dir, logText)

  onLog("Planning fix")
  const planRaw = await openaiResponses(apiKey, model, plannerInput(bundle), temperature)
  const plan = safeJson(planRaw)
  if (!plan) throw new Error("Planner returned invalid JSON")

  onLog("Generating patch (unified diff)")
  let patchRaw = await openaiResponses(apiKey, model, patcherInput(bundle, JSON.stringify(plan), files), temperature)
  if (!isLikelyUnifiedDiff(patchRaw)) {
    onLog("Patch invalid; retrying with stricter format")
    patchRaw = await openaiResponses(
      apiKey,
      model,
      patcherRetryInput(bundle, JSON.stringify(plan), files, "Invalid diff format", "FILE_SNIPPET: none"),
      temperature
    )
    if (!isLikelyUnifiedDiff(patchRaw)) {
      throw new Error("Patch invalid after retry; not a unified diff.")
    }
  }

  const branch = `selfheal/run-${runId}-${headSha.slice(0, 8)}`
  onLog(`Creating branch ${branch}`)
  createBranch(dir, branch)

  onLog("Applying patch")
  try {
    applyPatch(dir, patchRaw)
  } catch (error: any) {
    const msg = (error?.message || "Patch apply failed").toString()
    const snippet = extractSnippetFromError(dir, msg)
    onLog("Patch apply failed; retrying with tighter constraints")
    patchRaw = await openaiResponses(
      apiKey,
      model,
      patcherRetryInput(bundle, JSON.stringify(plan), files, msg, snippet),
      temperature
    )
    if (!isLikelyUnifiedDiff(patchRaw)) {
      throw new Error("Patch invalid after retry; not a unified diff.")
    }
    try {
      applyPatch(dir, patchRaw)
    } catch (retryError: any) {
      const retryMsg = (retryError?.message || "Patch apply failed").toString()
      const retrySnippet = extractSnippetFromError(dir, retryMsg)
      onLog("Patch apply failed again; attempting full-file rewrite")
      const rewriteRaw = await openaiResponses(
        apiKey,
        model,
        fileRewriteInput(bundle, JSON.stringify(plan), files, retryMsg, retrySnippet),
        temperature
      )
      const rewriteJson = safeJson(rewriteRaw)
      if (!rewriteJson || !Array.isArray(rewriteJson.files)) {
        throw new Error("File rewrite failed; invalid JSON output.")
      }
      if (rewriteJson.files.length === 0) {
        const strictRaw = await openaiResponses(
          apiKey,
          model,
          fileRewriteStrictInput(bundle, JSON.stringify(plan), files, retryMsg, retrySnippet),
          temperature
        )
        const strictJson = safeJson(strictRaw)
        if (!strictJson || !Array.isArray(strictJson.files) || strictJson.files.length === 0) {
          throw new Error("File rewrite payload is empty.")
        }
        applyFileRewrites(dir, strictJson.files, new Set(files))
        return
      }
      applyFileRewrites(dir, rewriteJson.files, new Set(files))
    }
  }

  onLog(`Verifying: ${verifyCmd}`)
  const verifyLog = runVerify(dir, verifyCmd)

  onLog("Committing changes")
  const stat = diffStat(dir)
  commitAll(dir, `Self-heal: CI fix for run ${runId}`)

  onLog("Pushing branch")
  pushBranch(dir, githubToken, owner, repo, branch)

  onLog("Writing PR body")
  const prBody = await openaiResponses(apiKey, model, prBodyInput(bundle, JSON.stringify(plan), stat, verifyLog), temperature)

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

  return {
    prUrl: pr.html_url as string,
    diffStat: stat,
    verifyLog: clip(verifyLog),
    patchPreview: clip(patchRaw, 12000),
    prBody: clip(prBody, 12000),
    bundle: clip(bundle, 12000),
    bundleFiles: files
  }
}
