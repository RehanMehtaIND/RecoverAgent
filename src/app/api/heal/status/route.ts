import { NextResponse } from "next/server"
import { getJob } from "@/lib/store"

export async function GET(req: Request) {
  const u = new URL(req.url)
  const jobId = u.searchParams.get("jobId") || ""
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  const job = getJob(jobId)
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ job })
}