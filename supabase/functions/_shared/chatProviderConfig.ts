const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'openai/gpt-6-luna'
const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small'

export function chatProviderConfig(config: {
  baseUrl?: string | null
  model?: string | null
  embeddingModel?: string | null
} = {}) {
  return {
    baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
    model: config.model ?? DEFAULT_MODEL,
    embeddingModel: config.embeddingModel ?? DEFAULT_EMBEDDING_MODEL,
  }
}
