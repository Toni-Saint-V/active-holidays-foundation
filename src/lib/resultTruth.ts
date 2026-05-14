import { derivePublicReadinessFromResult, type Case, type PublicReadinessProjection, type ResultPayload } from '@shared/contracts'
import { ApiError } from '@/lib/apiClient'
import { getCaseAccessToken } from '@/lib/caseAccessSession'
import type { CountryCode } from '@/lib/constants'

type SearchParamsLike = {
  get(name: string): string | null
}

export type ResultTruthRecoveryCode =
  | 'missing_case_id'
  | 'missing_case_access'
  | 'case_access_forbidden'
  | 'case_not_found'
  | 'unavailable'
export type ResultType = 'preliminary' | 'verified'
export type ConfidenceBand = 'low' | 'medium' | 'high'

export type ResultTruthReady = {
  status: 'ready'
  caseId: string
  caseData: Case
  result: ResultPayload
  readiness: PublicReadinessProjection
  country: CountryCode
  daysToTrip: number
  resultType: ResultType
  documentsVerified: boolean
  confidencePercent: number
  confidenceBand: ConfidenceBand
  provenance: {
    source: 'server_case_result'
    computedAt: string
    evidenceStatus: ResultPayload['trust']['evidenceStatus']
    freshnessStatus: ResultPayload['trust']['freshnessStatus']
    lastCheckedAt: string
  }
}

export type ResultTruthRecovery = {
  status: 'recovery'
  code: ResultTruthRecoveryCode
  caseId: string | null
  message: string
}

export type ResultTruthResolution = ResultTruthReady | ResultTruthRecovery

const VALID_COUNTRIES: CountryCode[] = ['IT', 'ES', 'FR', 'GR']

function parseCaseId(searchParams: SearchParamsLike): string | null {
  const raw = searchParams.get('caseId')
  if (!raw) return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getSignalString(caseData: Case, signalId: string): string | null {
  const record = caseData.signals.find((signal) => signal.id === signalId)
  if (!record || typeof record.value !== 'string') return null
  const value = record.value.trim()
  return value.length > 0 ? value : null
}

function getSignalNumber(caseData: Case, signalId: string): number | null {
  const record = caseData.signals.find((signal) => signal.id === signalId)
  if (!record || typeof record.value !== 'number') return null
  if (!Number.isFinite(record.value)) return null
  return record.value
}

function deriveCountry(caseData: Case): CountryCode {
  const destination = getSignalString(caseData, 'destination')?.toUpperCase()
  if (destination && VALID_COUNTRIES.includes(destination as CountryCode)) {
    return destination as CountryCode
  }
  if (caseData.productType === 'residency_es') return 'ES'
  return 'IT'
}

function deriveDaysToTrip(caseData: Case): number {
  const timelineWeeks = getSignalNumber(caseData, 'timeline_weeks')
  if (timelineWeeks !== null && timelineWeeks >= 0) {
    return Math.max(0, Math.round(timelineWeeks * 7))
  }

  const durationDays = getSignalNumber(caseData, 'trip_duration_days')
  if (durationDays !== null && durationDays >= 0) {
    return Math.max(0, Math.round(durationDays))
  }

  return 24
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function deriveConfidenceBand(confidencePercent: number): ConfidenceBand {
  if (confidencePercent >= 75) return 'high'
  if (confidencePercent >= 45) return 'medium'
  return 'low'
}

function deriveDocumentsVerified(result: ResultPayload): boolean {
  const hasRequiredDocs = result.documents.requiredCount > 0
  const enoughReady = result.documents.readyCount >= result.documents.requiredCount
  const noBlockedItems = result.documents.items.every((item) => item.status !== 'blocked')

  return (
    hasRequiredDocs &&
    enoughReady &&
    noBlockedItems &&
    result.trust.evidenceStatus === 'valid' &&
    result.assumptions.length === 0
  )
}

export async function resolveResultTruth(input: {
  searchParams: SearchParamsLike
  getCase: (caseId: string) => Promise<Case>
  getResult: (caseId: string) => Promise<ResultPayload>
  getAccessToken?: (caseId: string) => string | null
}): Promise<ResultTruthResolution> {
  const caseId = parseCaseId(input.searchParams)

  if (!caseId) {
    return {
      status: 'recovery',
      code: 'missing_case_id',
      caseId: null,
      message: 'Не найден идентификатор кейса. Начните с анкеты, чтобы собрать результат честно.'
    }
  }
  const accessToken = (input.getAccessToken ?? getCaseAccessToken)(caseId)
  if (!accessToken) {
    return {
      status: 'recovery',
      code: 'missing_case_access',
      caseId,
      message: 'Токен доступа к кейсу не найден. Начните с анкеты, чтобы открыть результат безопасно.'
    }
  }

  try {
    const [caseData, result] = await Promise.all([
      input.getCase(caseId),
      input.getResult(caseId)
    ])

    if (result.caseId !== caseData.id) {
      return {
        status: 'recovery',
        code: 'unavailable',
        caseId,
        message: 'Сервер вернул несогласованные данные кейса. Повторите расчёт из анкеты.'
      }
    }

    const confidencePercent = clampPercent(result.trust.confidence * 100)
    const documentsVerified = deriveDocumentsVerified(result)

    return {
      status: 'ready',
      caseId,
      caseData,
      result,
      readiness: derivePublicReadinessFromResult(result),
      country: deriveCountry(caseData),
      daysToTrip: deriveDaysToTrip(caseData),
      resultType: documentsVerified ? 'verified' : 'preliminary',
      documentsVerified,
      confidencePercent,
      confidenceBand: deriveConfidenceBand(confidencePercent),
      provenance: {
        source: 'server_case_result',
        computedAt: result.computedAt,
        evidenceStatus: result.trust.evidenceStatus,
        freshnessStatus: result.trust.freshnessStatus,
        lastCheckedAt: result.trust.lastCheckedAt
      }
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        status: 'recovery',
        code: 'case_not_found',
        caseId,
        message: `Кейс ${caseId} не найден. Запустите анкету заново.`
      }
    }
    if (error instanceof ApiError && error.code === 'case_access_forbidden') {
      return {
        status: 'recovery',
        code: 'case_access_forbidden',
        caseId,
        message: 'Доступ к кейсу закрыт. Вернитесь к анкете и соберите новый кейс.'
      }
    }

    return {
      status: 'recovery',
      code: 'unavailable',
      caseId,
      message: 'Не удалось получить серверный результат. Повторите попытку из анкеты.'
    }
  }
}
