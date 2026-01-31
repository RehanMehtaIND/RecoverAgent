import { execSync } from "node:child_process"
import fs from "node:fs"

function sh(cmd: string, cwd: string) {
  return execSync(cmd, { encoding: "utf8", cwd }).trim()
}

function readFileSafe(p: string, limit = 14000) {
  if (!fs.existsSync(p)) return ""
  const t = fs.readFileSync(p, "utf8")
  return t.length > limit ? t.slice(0, limit) + "\n...[truncated]" : t
}

function selectRelevantFilesFromLog(logText: string, cwd: string) {
  const hits = new Set<string>()
  const patterns = [
    /File "([^"]+)"/g,
    /(\S+\.(js|ts|tsx|jsx|py|go|java|rb|php)):\d+/g,
    /(\b[\w./-]+\.(js|ts|tsx|jsx|json|html|css|md|txt))\b/g
  ]
  for (const re of patterns) {
    let m: any
    while ((m = re.exec(logText)) !== null) {
      const p = m[1]
      if (!p) continue
      if (p.includes("node_modules")) continue
      if (p.startsWith("/")) continue
      const full = `${cwd}/${p}`
      if (fs.existsSync(full)) hits.add(p)
    }
  }
  return Array.from(hits).slice(0, 12)
}

function listRepoFiles(cwd: string) {
  try {
    return sh("git ls-files", cwd).split("\n").filter(Boolean)
  } catch {
    return []
  }
}

export function buildBundle(cwd: string, logText: string) {
  const head = sh("git rev-parse HEAD", cwd)
  const msg = sh("git log -1 --pretty=%B", cwd)
  let changed: string[] = []
  try {
    changed = sh("git diff --name-only HEAD~1..HEAD", cwd).split("\n").filter(Boolean)
  } catch {
    changed = []
  }

  const rel = selectRelevantFilesFromLog(logText, cwd)
  let files = Array.from(new Set([...rel, ...changed]))

  if (files.length === 0) {
    const repoFiles = listRepoFiles(cwd)
    const preferred = repoFiles.filter(p => p.startsWith("src/") || p.startsWith("tests/"))
    const roots = repoFiles.filter(p => ["package.json", "README.md"].includes(p))
    files = Array.from(new Set([...roots, ...preferred])).slice(0, 12)
  }

  files = files.slice(0, 18)

  const blobs = files.map(p => `--- ${p} ---\n${readFileSafe(`${cwd}/${p}`)}`).join("\n\n")

  const bundle =
`REPO_META
HEAD: ${head}

LAST_COMMIT_MESSAGE
${msg}

CHANGED_FILES
${changed.join("\n")}

CI_FAILURE_LOG
${logText}

RELEVANT_FILES
${blobs}`

  return { bundle, files }
}
