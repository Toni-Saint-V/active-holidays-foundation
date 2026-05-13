type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function readPositiveInteger(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function clientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  return forwardedFor || realIp || request.headers.get('origin') || 'anonymous'
}

export function resetAiApiRateLimitForTests(): void {
  buckets.clear()
}

export function checkAiApiRateLimit(request: Request): Response | null {
  if (process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_DISABLED === 'true') return null

  const max = readPositiveInteger(process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_AI_MAX) ?? 20
  const windowMs = readPositiveInteger(process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_AI_WINDOW_MS) ?? 60_000
  const now = Date.now()
  const key = `ai:${clientKey(request)}`
  const current = buckets.get(key)
  const bucket: Bucket =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          resetAt: now + windowMs,
        }

  bucket.count += 1
  buckets.set(key, bucket)

  if (bucket.count <= max) return null

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  return Response.json(
    { message: 'Слишком много AI-запросов. Повторите позже.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
      },
    }
  )
}
