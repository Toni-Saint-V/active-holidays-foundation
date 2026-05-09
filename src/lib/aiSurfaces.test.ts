import { describe, expect, it, vi } from 'vitest'
import { buildHumanReviewAi, buildIntakeAi, buildLandingAi, buildResultAi } from '@/lib/aiSurfaces'

describe('screen AI public payload', () => {
  it('returns schema-safe outputs without internal quality diagnostics', async () => {
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
      expect(['ai_structured', 'rule_based']).toContain(output.source)
      expect('quality' in output).toBe(false)
      const serialized = JSON.stringify(output)
      expect(serialized).not.toMatch(/quality|score|confidence|fallback_upgraded|expert_ready|deterministic_recovery/i)
    }
  })

  it('keeps visible copy compact and free from internal tokens', async () => {
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

    expect(visibleCopy).not.toMatch(/90\/100|порог|fallback|quality|Критерий качества|deterministic_recovery/i)
    expect(landing.bullets.every((item) => item.length <= 54)).toBe(true)
    expect(result.timeline.every((item) => item.action.length <= 72)).toBe(true)
  })
})
