type ChatEvalSample = { status: string; firstOutputMs: number | null }

export function summarizeChatEval(samples: ChatEvalSample[]) {
  const durations = samples
    .filter((sample) => sample.status === 'ok' && Number.isFinite(sample.firstOutputMs))
    .map((sample) => sample.firstOutputMs as number)
    .sort((a, b) => a - b)
  const middle = Math.floor(durations.length / 2)
  const medianMs = durations.length
    ? durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2
    : null

  return {
    count: samples.length,
    failures: samples.length - durations.length,
    medianMs,
    p95Ms: durations.length ? durations[Math.ceil(0.95 * durations.length) - 1] : null,
  }
}
