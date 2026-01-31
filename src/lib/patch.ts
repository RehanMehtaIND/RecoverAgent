import fs from "node:fs"
import { execSync } from "node:child_process"

function extractUnifiedDiff(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return ""

  const fenced = trimmed.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed

  const markers = ["diff --git ", "--- ", "+++ "]
  const idx = markers
    .map(m => candidate.indexOf(m))
    .filter(i => i >= 0)
    .sort((a, b) => a - b)[0]

  const sliced = idx !== undefined ? candidate.slice(idx) : candidate
  return sliced.endsWith("\n") ? sliced : `${sliced}\n`
}

export function applyPatch(cwd: string, diffText: string) {
  const p = `${cwd}/.selfheal.patch`
  const normalized = extractUnifiedDiff(diffText)
  if (!normalized) {
    throw new Error("Patch is empty or invalid; no diff content found.")
  }
  const cleaned = normalized
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, ""))
    .join("\n")
  fs.writeFileSync(p, cleaned)
  try {
    const attempts = [
      "git apply --whitespace=fix --recount .selfheal.patch",
      "git apply --whitespace=fix --recount --ignore-whitespace .selfheal.patch",
      "git apply --whitespace=fix --recount --unidiff-zero .selfheal.patch"
    ]
    let lastErr = ""
    for (const cmd of attempts) {
      try {
        execSync(cmd, { cwd, encoding: "utf8" })
        return
      } catch (error: any) {
        const stderr = (error?.stderr || "").toString()
        const stdout = (error?.stdout || "").toString()
        lastErr = stderr || stdout || "No stderr/stdout."
      }
    }
    const context = normalized.split("\n").slice(0, 20).join("\n")
    throw new Error(`git apply failed.\n${lastErr}\nPatch preview:\n${context}`)
  } finally {
    fs.unlinkSync(p)
  }
}

export function diffStat(cwd: string) {
  return execSync("git diff --stat", { cwd, encoding: "utf8" }).trim()
}
