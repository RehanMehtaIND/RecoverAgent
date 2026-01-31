import { execSync } from "node:child_process"

export function runVerify(cwd: string, cmd: string) {
  const r = execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  return `$ ${cmd}\n${r}`.slice(0, 16000)
}