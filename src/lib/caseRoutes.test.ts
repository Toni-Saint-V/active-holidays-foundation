import { describe, expect, it } from 'vitest'
import { buildCalculatingUrl, buildHumanReviewUrl, buildResultUrl } from './caseRoutes'

describe('caseRoutes', () => {
  it('keeps token-like params out of route URLs', () => {
    const caseId = 'case-123'
    const calculating = buildCalculatingUrl(caseId)
    const result = buildResultUrl(caseId)
    const humanReview = buildHumanReviewUrl(caseId)

    expect(calculating).toBe('/calculating?caseId=case-123')
    expect(result).toBe('/result?caseId=case-123')
    expect(humanReview).toBe('/human-review?caseId=case-123')

    for (const url of [calculating, result, humanReview]) {
      expect(url).not.toContain('accessToken=')
      expect(url).not.toContain('token=')
      expect(url).not.toContain('x-active-holidays-case-access')
    }
  })
})
