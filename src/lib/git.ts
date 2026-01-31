import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

function sh(cmd: string, cwd: string) {
  return execSync(cmd, { encoding: "utf8", cwd }).trim()
}

export function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "selfheal-"))
  return dir
}

export function cloneAtSha(repoUrl: string, sha: string, dir: string) {
  sh(`git clone ${repoUrl} .`, dir)
  sh(`git checkout ${sha}`, dir)
}

export function configureUser(dir: string) {
  sh(`git config user.email "selfheal@bot.local"`, dir)
  sh(`git config user.name "selfheal-bot"`, dir)
}

export function createBranch(dir: string, name: string) {
  sh(`git checkout -b ${name}`, dir)
}

export function commitAll(dir: string, msg: string) {
  sh("git add -A", dir)
  sh(`git commit -m "${msg.replace(/"/g, '\\"')}"`, dir)
}

export function pushBranch(dir: string, token: string, owner: string, repo: string, branch: string) {
  const url = `https://${token}@github.com/${owner}/${repo}.git`
  sh(`git remote set-url origin ${url}`, dir)
  sh(`git push -u origin ${branch}`, dir)
}