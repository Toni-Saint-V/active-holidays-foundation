import { describe, expect, it, vi } from 'vitest'
import { buildHumanReviewAi, buildIntakeAi, buildLandingAi, buildResultAi } from '@/lib/aiSurfaces'

describe('screen AI quality gate', () => {
  it('keeps fallback screen AI at expert quality threshold', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')

    const outputs = await Promise.all([
      buildLandingAi({ country: 'IT' }),
      buildIntakeAi({
        country: 'ES',
        purpose: 'Туризм',
        refusalContext: 'Был отказ из-за слабых документов и непонятного маршрута.',
      }),
      buildResultAi({
        country: 'FR',
        verdict: 'GO_WITH_CONDITIONS',
        daysToTrip: 18,
        departureDate: '2026-06-15',
        returnDate: '2026-06-29',
        topRisk: 'Дефицит слотов в визовых центрах.',
        missingItems: ['Не указана цель поездки'],
      }),
      buildHumanReviewAi({
        country: 'GR',
        verdict: 'HUMAN_REVIEW',
        fullName: 'Анна',
        contact: '@anna',
        context: 'Нужна проверка документов до подачи.',
      }),
    ])

    for (const output of outputs) {
      expect(output.quality.score).toBeGreaterThanOrEqual(90)
      expect(output.quality.threshold).toBe(90)
      expect(output.quality.criteria).toHaveLength(6)
      expect(output.quality.criteria.every((criterion) => criterion.score >= 90)).toBe(true)
    }
  })

  it('keeps public AI copy compact and hides internal scoring language', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')

    const landing = await buildLandingAi({ country: 'IT' })
    const result = await buildResultAi({
      country: 'IT',
      verdict: 'GO_WITH_CONDITIONS',
      daysToTrip: 18,
      departureDate: '2026-06-20',
      returnDate: '2026-06-29',
      topRisk: 'Очереди в визовых центрах май–август.',
      missingItems: [],
    })

    const visibleCopy = [
      landing.title,
      ...landing.bullets,
      landing.note,
      result.title,
      ...result.timeline.flatMap((item) => [item.horizon, item.action]),
      result.contrarian,
      result.tripwire,
    ].join(' ')

    expect(visibleCopy).not.toMatch(/90\/100|порог|fallback|Критерий качества/i)
    expect(landing.bullets.every((item) => item.length <= 54)).toBe(true)
    expect(result.timeline.every((item) => item.action.length <= 72)).toBe(true)
  })
})
