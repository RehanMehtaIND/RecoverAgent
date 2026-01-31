import { Suspense } from "react"
import RunClient from "./RunClient"

export default function RunPage() {
  return (
    <Suspense fallback={<div style={{ opacity: 0.8 }}>Loading…</div>}>
      <RunClient />
    </Suspense>
  )
}
