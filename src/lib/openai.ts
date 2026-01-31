function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getRetryDelayMs(r: Response, attempt: number) {
  const retryAfter = r.headers.get("retry-after")
  const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : 0
  const base = Math.min(2000 * Math.pow(2, attempt), 15000)
  const jitter = Math.floor(Math.random() * 500)
  return Math.max(retryAfterMs, base + jitter)
}

export async function openaiResponses(apiKey: string, model: string, input: any, temperature = 0.2) {
  const maxRetries = 4
  let lastError = ""

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, input, temperature })
    })

    const text = await r.text()
    let j: any = null
    try { j = text ? JSON.parse(text) : null } catch { j = null }

    if (r.ok) {
      const out = (j.output || [])
        .flatMap((o: any) => o.content || [])
        .filter((c: any) => c.type === "output_text")
        .map((c: any) => c.text)
        .join("")

      return out || ""
    }

    const msg = j?.error?.message || `OpenAI error ${r.status}`
    lastError = msg

    if (r.status === 429 || r.status >= 500) {
      if (attempt < maxRetries) {
        await sleep(getRetryDelayMs(r, attempt))
        continue
      }
    }

    throw new Error(msg)
  }

  throw new Error(lastError || "OpenAI error")
}
