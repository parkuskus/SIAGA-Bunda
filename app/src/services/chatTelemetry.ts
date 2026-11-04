export function createChatTelemetry(now: () => number = () => performance.now()) {
  const startedAt = now()
  let outputRecorded = false

  return {
    firstOutput(mode: string) {
      if (outputRecorded) return false
      outputRecorded = true
      console.info("[kira] first_output_ms", { duration_ms: Math.round(now() - startedAt), mode })
      return true
    },
    complete() {
      console.info("[kira] response_complete_ms", { duration_ms: Math.round(now() - startedAt) })
    },
  }
}
