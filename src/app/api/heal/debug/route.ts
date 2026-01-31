import { NextResponse } from "next/server"
import { getJob } from "@/lib/store"

export async function GET(req: Request) {
  const u = new URL(req.url)
  const jobId = u.searchParams.get("jobId") || ""
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  const job = getJob(jobId)
  if (!job || !job.bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
  return new NextResponse(job.bundle, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="selfheal-bundle-${jobId}.txt"`
    }
  })
}
