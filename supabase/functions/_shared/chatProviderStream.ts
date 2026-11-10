export function providerStreamEvent(block: string): { text: string; finish: string | null; done: boolean } {
  const data = block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n')
  if (!data) return { text: '', finish: null, done: false }
  if (data === '[DONE]') return { text: '', finish: null, done: true }
  try {
    const payload = JSON.parse(data)
    if (payload.error) throw new Error()
    const choice = payload.choices?.[0]
    return { text: typeof choice?.delta?.content === 'string' ? choice.delta.content : '', finish: typeof choice?.finish_reason === 'string' ? choice.finish_reason : null, done: false }
  } catch {
    throw new Error('provider stream failed')
  }
}

export function providerStreamComplete(finish: string | null, done: boolean): boolean {
  return finish === 'stop' && done
}
