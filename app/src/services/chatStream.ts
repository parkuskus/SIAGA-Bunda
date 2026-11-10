export type StreamChatPayload = {
  answer?: unknown
  sources?: unknown
  escalate?: unknown
  hasRedResult?: unknown
  verified?: unknown
  diagnostics?: { requestId: string; timings: Record<string, number | null> }
}

export async function consumeChatStream(response: Response, onDelta: (text: string) => void): Promise<StreamChatPayload> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("Stream chatbot tidak tersedia")
  const decoder = new TextDecoder()
  let buffer = ""
  let final: StreamChatPayload | null = null
  const processEvent = (block: string) => {
    const data = block.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n")
    if (!data || data === "[DONE]") return
    const event = JSON.parse(data) as StreamChatPayload & { type?: string; text?: string; message?: string }
    if (event.type === "delta" && typeof event.text === "string") onDelta(event.text)
    else if (event.type === "done") final = event
    else if (event.type === "error") throw new Error(event.message || "Stream chatbot gagal")
  }

  while (true) {
    const { value, done } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: !done })
    else if (done) buffer += decoder.decode()
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ""
    for (const event of events) processEvent(event)
    if (done) break
  }
  if (buffer.trim()) processEvent(buffer)
  if (!final) throw new Error("Stream chatbot berakhir sebelum jawaban selesai")
  return final
}
