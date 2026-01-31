import { NextResponse } from "next/server"
import { getRun, downloadRunLogs } from "@/lib/github"
import { gunzipSync } from "node:zlib"

function unzipIfZip(buf: Buffer) {
  if (buf.length < 4) return buf
  const sig = buf.readUInt32LE(0)
  const zipSig = 0x04034b50
  if (sig === zipSig) return buf
  try {
    return gunzipSync(buf)
  } catch {
    return buf
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url)
  const id = Number(u.searchParams.get("id") || "0")
  const owner = u.searchParams.get("owner") || process.env.GITHUB_OWNER || ""
  const repo = u.searchParams.get("repo") || process.env.GITHUB_REPO || ""
  const token = u.searchParams.get("token") || process.env.GITHUB_TOKEN || ""

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  if (!owner || !repo) return NextResponse.json({ error: "Missing owner/repo" }, { status: 400 })
  if (!token) return NextResponse.json({ error: "Missing GitHub token" }, { status: 400 })

  try {
    const run = await getRun(token, owner, repo, id)
    const buf = await downloadRunLogs(token, owner, repo, id)
    const raw = unzipIfZip(buf)
    const text = raw.toString("utf8")
    const tail = text.slice(-24000)
    return NextResponse.json({ run, log: tail })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}