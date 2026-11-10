import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { consumeChatStream } from '../src/services/chatStream.ts'
import { formatChatEvalDuration, shouldStopChatEval, summarizeChatEval } from '../src/services/chatEvalMetrics.ts'

const STAGING_REF = 'gjizoreqciqelmkakluz'
const env = process.env

function projectRef(url) {
  return new URL(url).hostname.split('.')[0]
}

function hasStagingClaim(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return payload.app_mfa_verified === true
  } catch {
    return false
  }
}

function formatTimings(timings) {
  return Object.fromEntries(Object.entries(timings ?? {}).map(([phase, duration]) => [phase, formatChatEvalDuration(duration)]))
}

async function main() {
  if (!env.SUPABASE_URL || projectRef(env.SUPABASE_URL) !== STAGING_REF) throw new Error('Refusing to run against a non-staging Supabase project')
  if (!env.SUPABASE_ANON_KEY || !env.CHAT_EVAL_EMAIL || !env.CHAT_EVAL_PASSWORD) throw new Error('Staging URL, anon key, and test account credentials are required')
  const repeats = Number(env.CHAT_EVAL_REPEATS ?? 1)
  const cases = JSON.parse(await readFile(new URL('./chat-eval-cases.json', import.meta.url), 'utf8'))
  if (!Number.isInteger(repeats) || repeats < 1 || repeats * cases.length > 20) throw new Error('Repeat count must be between 1 and the staging chat rate limit')

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.signInWithPassword({ email: env.CHAT_EVAL_EMAIL, password: env.CHAT_EVAL_PASSWORD })
  if (error || !data.session || !hasStagingClaim(data.session.access_token)) throw new Error('Staging test login failed or lacks the staging MFA claim')

  const samples = []
  repeatsLoop: for (let repeat = 0; repeat < repeats; repeat++) {
    for (let index = 0; index < cases.length; index++) {
      const started = performance.now()
      let firstOutputAt = null
      try {
        const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/chat`, {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream, application/json',
          },
          body: JSON.stringify({ message: cases[index].message, history: [], hasRedResult: false, externalConsent: true }),
        })
        if (!response.ok) {
          let diagnostics
          try { diagnostics = (await response.json()).diagnostics } catch {}
          samples.push({ status: `http_${response.status}`, firstOutputMs: null })
          console.log(JSON.stringify({ case: index + 1, repeat: repeat + 1, status: `http_${response.status}`, requestId: diagnostics?.requestId ?? response.headers.get('x-chat-request-id') ?? null, providerFailure: diagnostics?.providerFailure ?? null, upstreamStatus: diagnostics?.upstreamStatus ?? null, phases: formatTimings(diagnostics?.timings) }))
          if (shouldStopChatEval(`http_${response.status}`, diagnostics?.upstreamStatus ?? null)) break repeatsLoop
          continue
        }

        let result
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
          result = await consumeChatStream(response, () => { firstOutputAt ??= performance.now() })
        } else {
          result = await response.json()
          if (result.error || typeof result.answer !== 'string' || !result.answer.trim()) throw new Error('invalid_response')
          firstOutputAt = performance.now()
        }
        if (typeof result.answer !== 'string' || !result.answer.trim()) throw new Error('empty_answer')
        const firstOutputMs = firstOutputAt === null ? null : Math.round(firstOutputAt - started)
        const completionMs = Math.round(performance.now() - started)
        samples.push({ status: firstOutputMs === null ? 'no_output' : 'ok', firstOutputMs })
        console.log(JSON.stringify({ case: index + 1, repeat: repeat + 1, status: firstOutputMs === null ? 'no_output' : 'ok', requestId: result.diagnostics?.requestId ?? response.headers.get('x-chat-request-id') ?? null, firstOutput: formatChatEvalDuration(firstOutputMs), completion: formatChatEvalDuration(completionMs), phases: formatTimings(result.diagnostics?.timings) }))
      } catch {
        samples.push({ status: 'failed', firstOutputMs: null })
        console.log(JSON.stringify({ case: index + 1, repeat: repeat + 1, status: 'failed' }))
      }
    }
  }

  const summary = summarizeChatEval(samples)
  console.log(JSON.stringify({ summary: { count: summary.count, failures: summary.failures, median: formatChatEvalDuration(summary.medianMs), p95: formatChatEvalDuration(summary.p95Ms) } }))
  await client.auth.signOut()
  if (samples.some((sample) => sample.status !== 'ok')) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Chat evaluation failed')
  process.exitCode = 1
})
