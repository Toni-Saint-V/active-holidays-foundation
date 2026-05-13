import { describe, expect, it, vi } from 'vitest'
import type { Case, ResultPayload } from '@shared/contracts'
import { ApiError } from '@/lib/apiClient'
import { resolveResultTruth } from '@/lib/resultTruth'

function createCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'case-123',
    title: 'Case 123',
    productType: 'travel',
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:00:00.000Z',
    signals: [
      { id: 'destination', value: 'IT', source: 'seed', capturedAt: '2026-05-10T10:00:00.000Z' },
      { id: 'timeline_weeks', value: 2, source: 'seed', capturedAt: '2026-05-10T10:00:00.000Z' },
      { id: 'documents_ready_count', value: 1, source: 'seed', capturedAt: '2026-05-10T10:00:00.000Z' },
      { id: 'documents_required_count', value: 3, source: 'seed', capturedAt: '2026-05-10T10:00:00.000Z' }
    ],
    overrides: [],
    preferences: [],
    forkedFrom: null,
    ...overrides
  }
}

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: 'rdc.v1',
    productType: 'travel',
    caseId: 'case-123',
    computedAt: '2026-05-10T10:00:00.000Z',
    verdict: 'NOT_NOW',
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: {
      id: 'risk-timeline',
      severity: 'high',
      label: 'Срок поездки',
      detail: 'До поездки мало времени.',
      triggeredBy: ['timeline_weeks'],
      pulseAmplitude: 0.9
    },
    risks: [],
    nextAction: {
      type: 'send_for_review',
      priority: 'human_review',
      label: 'Передать кейс эксперту',
      detail: 'Нужна ручная проверка.',
      targetScreen: 'human-review',
      triggeredBy: ['timeline_weeks']
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: 'R1',
        fired: true,
        category: 'timeline',
        priority: 10,
        productType: 'travel',
        output: { type: 'human_review_trigger' },
        consumedSignals: ['timeline_weeks'],
        explanation: 'Срок поездки требует ручной проверки.'
      }
    ],
    documents: {
      score: 0.34,
      readyCount: 1,
      requiredCount: 3,
      items: [
        {
          id: 'passport',
          label: 'Паспорт',
          status: 'ready',
          detail: 'Документ загружен.',
          pathId: null
        },
        {
          id: 'insurance',
          label: 'Страховка',
          status: 'blocked',
          detail: 'Документ отсутствует.',
          pathId: null
        }
      ]
    },
    trust: {
      confidence: 0.31,
      confidenceBreakdown: {
        value: 0.31,
        base: 0.31,
        capsApplied: ['human_review'],
        factors: []
      },
      evidenceStatus: 'missing',
      freshnessStatus: 'unknown',
      blockingReason: 'Нет подтверждённых документов.',
      humanReviewReason: 'Evidence gate requires review.',
      volatilityScore: 0.65,
      sources: [],
      lastCheckedAt: '2026-05-10T10:00:00.000Z'
    },
    assumptions: [
      {
        id: 'A1',
        label: 'Нет полного пакета',
        detail: 'Документы не загружены полностью.'
      }
    ],
    auditTrail: {
      version: 'rdc.v1',
      caseId: 'case-123',
      startedAt: '2026-05-10T10:00:00.000Z',
      finishedAt: '2026-05-10T10:00:00.050Z',
      totalMs: 50,
      steps: [
        {
          index: 0,
          name: 'collectSignals',
          tookMs: 1,
          inputsSummary: 'case',
          outputSummary: 'signals',
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  }
}

describe('resultTruth', () => {
  it('ignores tampered URL truth params and resolves canonical server truth by caseId', async () => {
    const searchParams = new URLSearchParams(
      'caseId=case-123&verdict=GO&documentsUploaded=true&resultType=verified&analysisConfidence=high&days=999'
    )

    const caseData = createCase()
    const serverResult = createResult()

    const getCase = vi.fn(async () => caseData)
    const getResult = vi.fn(async () => serverResult)

    const resolved = await resolveResultTruth({ searchParams, getCase, getResult })

    expect(getCase).toHaveBeenCalledWith('case-123')
    expect(getResult).toHaveBeenCalledWith('case-123')

    expect(resolved.status).toBe('ready')
    if (resolved.status !== 'ready') return

    expect(resolved.result).toBe(serverResult)
    expect(resolved.result.verdict).toBe('NOT_NOW')
    expect(resolved.readiness.sourceVerdict).toBe('NOT_NOW')
    expect(resolved.readiness.state).toBe('insufficient_data')

    expect(resolved.daysToTrip).toBe(14)
    expect(resolved.documentsVerified).toBe(false)
    expect(resolved.resultType).toBe('preliminary')
    expect(resolved.confidencePercent).toBe(31)
    expect(resolved.confidenceBand).not.toBe('high')
  })

  it('returns honest recovery for missing caseId', async () => {
    const searchParams = new URLSearchParams('verdict=GO&days=999')

    const resolved = await resolveResultTruth({
      searchParams,
      getCase: vi.fn(async () => createCase()),
      getResult: vi.fn(async () => createResult())
    })

    expect(resolved).toMatchObject({
      status: 'recovery',
      code: 'missing_case_id',
      caseId: null
    })
  })

  it('returns honest recovery for invalid caseId without crash', async () => {
    const searchParams = new URLSearchParams('caseId=missing-case&verdict=GO')

    const resolved = await resolveResultTruth({
      searchParams,
      getCase: vi.fn(async () => {
        throw new ApiError('not found', 404, 'case_not_found')
      }),
      getResult: vi.fn(async () => createResult())
    })

    expect(resolved).toMatchObject({
      status: 'recovery',
      code: 'case_not_found',
      caseId: 'missing-case'
    })
  })
})
