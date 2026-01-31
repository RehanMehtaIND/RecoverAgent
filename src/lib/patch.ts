import fs from "node:fs"
import { execSync } from "node:child_process"

export function applyPatch(cwd: string, diffText: string) {
  const p = `${cwd}/.selfheal.patch`
  fs.writeFileSync(p, diffText)
  execSync(`git apply .selfheal.patch`, { cwd, stdio: "inherit" })
  fs.unlinkSync(p)
}

export function diffStat(cwd: string) {
  return execSync("git diff --stat", { cwd, encoding: "utf8" }).trim()
}