import assert from 'node:assert/strict'
import { chatProviderOptions } from '../../supabase/functions/_shared/chatProviderOptions.ts'

assert.deepEqual(chatProviderOptions('https://openrouter.ai/api/v1', 'minimal'), { reasoning: { effort: 'minimal', exclude: true } })
assert.deepEqual(chatProviderOptions('https://api.openai.com/v1', 'minimal'), {})
assert.deepEqual(chatProviderOptions('https://openrouter.ai/api/v1', undefined), {})
assert.throws(() => chatProviderOptions('https://openrouter.ai/api/v1', 'fast'), /unsupported reasoning effort/)
console.log('Chat provider options only enable supported, configured OpenRouter reasoning')
