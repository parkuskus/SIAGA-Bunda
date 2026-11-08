export type ChatTurn = { role: "user" | "assistant"; content: string }

export function chatAuthorizationHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

export function buildExternalLlmMessages(systemPrompt: string, history: ChatTurn[], message: string, guideline: string) {
  const userContent = `POTONGAN PANDUAN YANG RELEVAN:\n${guideline || "Tidak ada potongan panduan yang cukup relevan."}\n\nPERTANYAAN TERBARU BUNDA:\n${message}`
  return [
    { role: "system" as const, content: systemPrompt },
    ...history,
    { role: "user" as const, content: userContent },
  ]
}
