import { Suspense } from "react"
import RunsClient from "./RunsClient"

export default function RunsPage() {
  return (
    <Suspense fallback={<div style={{ opacity: 0.8 }}>Loading…</div>}>
      <RunsClient />
    </Suspense>
  )
}
