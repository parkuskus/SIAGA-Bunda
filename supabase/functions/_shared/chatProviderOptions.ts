const REASONING_EFFORTS = new Set(['minimal', 'low', 'medium', 'high'])

export function chatProviderOptions(baseUrl: string, effort: string | undefined): Record<string, unknown> {
  if (!effort) return {}
  if (!REASONING_EFFORTS.has(effort)) throw new Error('unsupported reasoning effort')
  if (new URL(baseUrl).hostname !== 'openrouter.ai') return {}
  return { reasoning: { effort, exclude: true } }
}
