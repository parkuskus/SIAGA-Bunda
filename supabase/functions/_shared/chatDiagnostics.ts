export function chatDiagnostics(enabled: boolean, requestId: string, timings: Record<string, number | null>, upstreamStatus?: number, providerFailure?: 'network' | 'http') {
  return enabled ? { diagnostics: { requestId, timings, ...(upstreamStatus === undefined ? {} : { upstreamStatus }), ...(providerFailure ? { providerFailure } : {}) } } : {}
}
