import assert from 'node:assert/strict'
import { chatProviderConfig } from '../../supabase/functions/_shared/chatProviderConfig.ts'

assert.deepEqual(chatProviderConfig(), {
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'openai/gpt-6-luna',
  embeddingModel: 'openai/text-embedding-3-small',
})

assert.deepEqual(chatProviderConfig({
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
}), {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
})
