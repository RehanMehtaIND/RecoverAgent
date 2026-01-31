import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

export function runVerify(cwd: string, cmd: string) {
  const logs: string[] = []
  const run = (command: string, extraEnv: Record<string, string> = {}) => {
    try {
      const out = execSync(command, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...extraEnv }
      })
      logs.push(`$ ${command}\n${out}`.trim())
      return out
    } catch (error: any) {
      const out = (error?.stdout || "").toString()
      const err = (error?.stderr || "").toString()
      logs.push(`$ ${command}\n${out}${err}`.trim())
      throw new Error(`Command failed: ${command}\n${out}${err}`.trim())
    }
  }

  const pkg = path.join(cwd, "package.json")
  const nodeModules = path.join(cwd, "node_modules")
  if (fs.existsSync(pkg) && !fs.existsSync(nodeModules)) {
    const lock = path.join(cwd, "package-lock.json")
    const installCmd = fs.existsSync(lock)
      ? "npm ci --no-audit --no-fund"
      : "npm install --no-audit --no-fund"
    run(installCmd)
  }

  const pkgPath = path.join(cwd, "package.json")
  let extraEnv: Record<string, string> = {}
  if (fs.existsSync(pkgPath) && /(^|\s)npm\s+test(\s|$)/.test(cmd)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
      if (pkg?.type === "module") {
        extraEnv = { NODE_OPTIONS: "--experimental-vm-modules" }
      }
    } catch {
      // ignore
    }
  }

  run(cmd, extraEnv)
  return logs.join("\n\n").slice(0, 16000)
}
