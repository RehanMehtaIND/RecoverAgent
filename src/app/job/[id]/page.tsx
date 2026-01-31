import { Suspense } from "react"
import JobClient from "./JobClient"

export default function JobPage() {
  return (
    <Suspense fallback={<div style={{ opacity: 0.8 }}>Loading…</div>}>
      <JobClient />
    </Suspense>
  )
}
