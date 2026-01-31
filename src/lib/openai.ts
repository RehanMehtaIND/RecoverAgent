export async function openaiResponses(apiKey: string, model: string, input: any, temperature = 0.2) {
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
  if (!r.ok) throw new Error(j?.error?.message || `OpenAI error ${r.status}`)

  const out = (j.output || [])
    .flatMap((o: any) => o.content || [])
    .filter((c: any) => c.type === "output_text")
    .map((c: any) => c.text)
    .join("")

  return out || ""
}