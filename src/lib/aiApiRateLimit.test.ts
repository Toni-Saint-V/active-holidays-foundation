import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkAiApiRateLimit, resetAiApiRateLimitForTests } from './aiApiRateLimit.server'

const previousEnv = {
  max: process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_AI_MAX,
  windowMs: process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_AI_WINDOW_MS,
  disabled: process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_DISABLED,
}

function restoreEnv(): void {
  const pairs: Array<[string, string | undefined]> = [
    ['ACTIVE_HOLIDAYS_RATE_LIMIT_AI_MAX', previousEnv.max],
    ['ACTIVE_HOLIDAYS_RATE_LIMIT_AI_WINDOW_MS', previousEnv.windowMs],
    ['ACTIVE_HOLIDAYS_RATE_LIMIT_DISABLED', previousEnv.disabled],
  ]
  for (const [key, value] of pairs) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function requestFor(ip: string): Request {
  return new Request('http://localhost/api/ai/result', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  })
}

beforeEach(() => {
  process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_AI_MAX = '1'
  process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_AI_WINDOW_MS = '60000'
  delete process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_DISABLED
  resetAiApiRateLimitForTests()
})

afterEach(() => {
  resetAiApiRateLimitForTests()
  restoreEnv()
})

describe('/api/ai rate limit guard', () => {
  it('returns 429 after the configured threshold for the same client key', async () => {
    expect(checkAiApiRateLimit(requestFor('203.0.113.10'))).toBeNull()

    const limited = checkAiApiRateLimit(requestFor('203.0.113.10'))
    expect(limited).not.toBeNull()
    expect(limited?.status).toBe(429)
    await expect(limited?.json()).resolves.toMatchObject({
      message: expect.stringContaining('Слишком много AI-запросов'),
    })
  })
})
