import { NextResponse } from "next/server"
import { listRuns } from "@/lib/github"

export async function GET(req: Request) {
  const u = new URL(req.url)
  const owner = u.searchParams.get("owner") || process.env.GITHUB_OWNER || ""
  const repo = u.searchParams.get("repo") || process.env.GITHUB_REPO || ""
  const token = u.searchParams.get("token") || process.env.GITHUB_TOKEN || ""

  if (!owner || !repo) return NextResponse.json({ error: "Missing owner/repo" }, { status: 400 })
  if (!token) return NextResponse.json({ error: "Missing GitHub token" }, { status: 400 })

  try {
    const runs = await listRuns(token, owner, repo)
    return NextResponse.json({ runs })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}