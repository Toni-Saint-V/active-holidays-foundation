import type { Express } from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Duplex } from 'node:stream'
import { createApp } from '../index'
import { CASE_ACCESS_HEADER } from '@shared/contracts'

let app: Express
const previousInternalApiToken = process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN
const INTERNAL_API_TOKEN = 'test-internal-case-access-token'
const devHeaders = {
  'x-active-holidays-dev-seed-access': '1'
}

class MockSocket extends Duplex {
  readonly chunks: Buffer[] = []
  remoteAddress = '127.0.0.1'

  _read(): void {}

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    callback()
  }

  setTimeout(): this {
    return this
  }

  setNoDelay(): this {
    return this
  }

  setKeepAlive(): this {
    return this
  }

  connect(): this {
    return this
  }

  resetAndDestroy(): void {
    this.destroy()
  }

  address() {
    return { address: '127.0.0.1', family: 'IPv4', port: 0 }
  }

  ref(): this {
    return this
  }

  unref(): this {
    return this
  }

  destroySoon(): void {
    this.destroy()
  }
}

beforeAll(async () => {
  process.env.ACTIVE_HOLIDAYS_DEV_SEED_ACCESS = '1'
  process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = INTERNAL_API_TOKEN
  app = await createApp()
})

afterAll(() => {
  if (previousInternalApiToken === undefined) {
    delete process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN
    return
  }
  process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = previousInternalApiToken
})

async function requestJson(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const payload = body === undefined ? null : JSON.stringify(body)
  const socket = new MockSocket()
  const req = new IncomingMessage(socket as never)
  req.method = method
  req.url = path
  req.headers = {
    ...(payload
      ? {
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(payload))
        }
      : {}),
    ...(headers ?? {})
  }
  if (payload) {
    req.push(payload)
  }
  req.push(null)

  const res = new ServerResponse(req)
  res.assignSocket(socket as never)

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const resolveOnce = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const rejectOnce = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    res.on('finish', resolveOnce)
    res.on('close', () => {
      if (res.writableEnded) resolveOnce()
    })
    res.on('error', reject)
    app(req as never, res as never, (error?: unknown) => {
      if (error instanceof Error) {
        rejectOnce(error)
        return
      }
      if (res.writableEnded) resolveOnce()
    })
  })

  const raw = Buffer.concat(socket.chunks).toString('utf8')
  const bodyText = raw.split('\r\n\r\n').slice(1).join('\r\n\r\n')
  const json = bodyText.length > 0 ? JSON.parse(bodyText) : null
  return { status: res.statusCode, json } as const
}

describe('case access ownership boundary', () => {
  it('returns access credential on fork and enforces it on reads', async () => {
    const forked = await requestJson('POST', '/api/cases/s1-rf-italy/fork', {}, devHeaders)
    expect(forked.status).toBe(200)

    const caseId = forked.json.case.id as string
    const accessToken = forked.json.access.accessToken as string

    expect(caseId).toMatch(/^s1-rf-italy-fork-\d+$/)
    expect(typeof accessToken).toBe('string')
    expect(accessToken.length).toBeGreaterThanOrEqual(24)
    expect(accessToken).not.toContain(caseId)

    const missing = await requestJson('GET', `/api/cases/${caseId}`)
    expect(missing.status).toBe(403)
    expect(missing.json.error).toBe('case_access_forbidden')

    const allowed = await requestJson('GET', `/api/cases/${caseId}`, undefined, {
      [CASE_ACCESS_HEADER]: accessToken
    })
    expect(allowed.status).toBe(200)
    expect(allowed.json.id).toBe(caseId)

    const bad = await requestJson('GET', `/api/cases/${caseId}/result`, undefined, {
      [CASE_ACCESS_HEADER]: `${accessToken}-tampered`
    })
    expect(bad.status).toBe(403)
    expect(bad.json.error).toBe('case_access_forbidden')

    const missingResult = await requestJson('GET', `/api/cases/${caseId}/result`)
    expect(missingResult.status).toBe(403)
    expect(missingResult.json.error).toBe('case_access_forbidden')

    const missingHumanReview = await requestJson('GET', `/api/cases/${caseId}/human-review`)
    expect(missingHumanReview.status).toBe(403)
    expect(missingHumanReview.json.error).toBe('case_access_forbidden')

    const badHumanReview = await requestJson(
      'GET',
      `/api/cases/${caseId}/human-review`,
      undefined,
      { [CASE_ACCESS_HEADER]: `${accessToken}-tampered` }
    )
    expect(badHumanReview.status).toBe(403)
    expect(badHumanReview.json.error).toBe('case_access_forbidden')

    const missingPacket = await requestJson('GET', `/api/cases/${caseId}/human-review/packet`, undefined, {
      'x-active-holidays-internal-token': INTERNAL_API_TOKEN
    })
    expect(missingPacket.status).toBe(403)
    expect(missingPacket.json.error).toBe('case_access_forbidden')

    const viaQuery = await requestJson(
      'GET',
      `/api/cases/${caseId}/result?accessToken=${encodeURIComponent(accessToken)}`
    )
    expect(viaQuery.status).toBe(403)
    expect(viaQuery.json.error).toBe('case_access_forbidden')

    const viaQueryCase = await requestJson(
      'GET',
      `/api/cases/${caseId}?accessToken=${encodeURIComponent(accessToken)}`
    )
    expect(viaQueryCase.status).toBe(403)
    expect(viaQueryCase.json.error).toBe('case_access_forbidden')

    const viaQueryHumanReview = await requestJson(
      'GET',
      `/api/cases/${caseId}/human-review?accessToken=${encodeURIComponent(accessToken)}`
    )
    expect(viaQueryHumanReview.status).toBe(403)
    expect(viaQueryHumanReview.json.error).toBe('case_access_forbidden')

    const viaQueryPacket = await requestJson(
      'GET',
      `/api/cases/${caseId}/human-review/packet?accessToken=${encodeURIComponent(accessToken)}`,
      undefined,
      {
        'x-active-holidays-internal-token': INTERNAL_API_TOKEN
      }
    )
    expect(viaQueryPacket.status).toBe(403)
    expect(viaQueryPacket.json.error).toBe('case_access_forbidden')
  })

  it('rotates case token via internal access grant and invalidates the old token', async () => {
    const forked = await requestJson('POST', '/api/cases/s1-rf-italy/fork', {}, devHeaders)
    expect(forked.status).toBe(200)

    const caseId = forked.json.case.id as string
    const oldToken = forked.json.access.accessToken as string

    const grant = await requestJson(
      'POST',
      `/api/cases/${caseId}/access/grant`,
      {},
      { 'x-active-holidays-internal-token': INTERNAL_API_TOKEN }
    )
    expect(grant.status).toBe(200)

    const newToken = grant.json.access.accessToken as string
    expect(typeof newToken).toBe('string')
    expect(newToken.length).toBeGreaterThanOrEqual(24)
    expect(newToken).not.toBe(oldToken)

    const oldTokenRead = await requestJson('GET', `/api/cases/${caseId}`, undefined, {
      [CASE_ACCESS_HEADER]: oldToken
    })
    expect(oldTokenRead.status).toBe(403)
    expect(oldTokenRead.json.error).toBe('case_access_forbidden')

    const newTokenRead = await requestJson('GET', `/api/cases/${caseId}`, undefined, {
      [CASE_ACCESS_HEADER]: newToken
    })
    expect(newTokenRead.status).toBe(200)
    expect(newTokenRead.json.id).toBe(caseId)
  })

  it('rejects case A token when accessing case B', async () => {
    const first = await requestJson('POST', '/api/cases/s1-rf-italy/fork', {}, devHeaders)
    const second = await requestJson('POST', '/api/cases/s1-rf-italy/fork', {}, devHeaders)

    const tokenA = first.json.access.accessToken as string
    const caseB = second.json.case.id as string

    const response = await requestJson('GET', `/api/cases/${caseB}/result`, undefined, {
      [CASE_ACCESS_HEADER]: tokenA
    })

    expect(response.status).toBe(403)
    expect(response.json.error).toBe('case_access_forbidden')

    const caseRead = await requestJson('GET', `/api/cases/${caseB}`, undefined, {
      [CASE_ACCESS_HEADER]: tokenA
    })
    expect(caseRead.status).toBe(403)
    expect(caseRead.json.error).toBe('case_access_forbidden')

    const humanReviewRead = await requestJson('GET', `/api/cases/${caseB}/human-review`, undefined, {
      [CASE_ACCESS_HEADER]: tokenA
    })
    expect(humanReviewRead.status).toBe(403)
    expect(humanReviewRead.json.error).toBe('case_access_forbidden')

    const humanReviewPacketRead = await requestJson(
      'GET',
      `/api/cases/${caseB}/human-review/packet`,
      undefined,
      {
        [CASE_ACCESS_HEADER]: tokenA,
        'x-active-holidays-internal-token': INTERNAL_API_TOKEN
      }
    )
    expect(humanReviewPacketRead.status).toBe(403)
    expect(humanReviewPacketRead.json.error).toBe('case_access_forbidden')
  })

  it('rejects write and derived routes without token for forked cases', async () => {
    const forked = await requestJson('POST', '/api/cases/s1-rf-italy/fork', {}, devHeaders)
    expect(forked.status).toBe(200)
    const caseId = forked.json.case.id as string

    const signals = await requestJson('POST', `/api/cases/${caseId}/signals`, { signals: [] })
    expect(signals.status).toBe(403)
    expect(signals.json.error).toBe('case_access_forbidden')

    const recompute = await requestJson('POST', `/api/cases/${caseId}/recompute`, {})
    expect(recompute.status).toBe(403)
    expect(recompute.json.error).toBe('case_access_forbidden')
  })
})
