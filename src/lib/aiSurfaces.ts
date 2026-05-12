import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { FORBIDDEN } from '@/lib/forbiddenCopy'
import {
  aiQualitySchema,
  humanReviewAiOutputSchema,
  intakeAiOutputSchema,
  landingAiOutputSchema,
  resultAiOutputSchema,
  type AiQuality,
  type HumanReviewAiInput,
  type HumanReviewAiOutput,
  type IntakeAiInput,
  type IntakeAiOutput,
  type LandingAiInput,
  type LandingAiOutput,
  type ResultAiInput,
  type ResultAiOutput,
} from '@/lib/aiSurfaceContracts'

const landingAiDraftSchema = landingAiOutputSchema
const intakeAiDraftSchema = intakeAiOutputSchema
const resultAiDraftSchema = resultAiOutputSchema
const humanReviewAiDraftSchema = humanReviewAiOutputSchema

type LandingAiDraft = LandingAiOutput
type IntakeAiDraft = IntakeAiOutput
type ResultAiDraft = ResultAiOutput
type HumanReviewAiDraft = HumanReviewAiOutput

const COUNTRY_LABEL: Record<'IT' | 'ES' | 'FR' | 'GR', string> = {
  IT: 'Италия',
  ES: 'Испания',
  FR: 'Франция',
  GR: 'Греция',
}

type QualityStatus = AiQuality['status']

const AI_QUALITY_THRESHOLD = 90
const EXPERT_SYSTEM_RULES =
  'Слабые и общие ответы запрещены. Пиши как топ-эксперт по визовым кейсам: конкретно, проверяемо, с риском, следующим действием и без общих фраз. Не обещай результат, не давай юридических гарантий, не используй проценты успеха.'

let cachedClient: OpenAI | null | undefined

type RuntimeEnv = Record<string, string | undefined>

function readRuntimeEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: RuntimeEnv } }).process?.env
  const value = env?.[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getClient(): OpenAI | null {
  if (cachedClient !== undefined) return cachedClient
  const apiKey = readRuntimeEnv('OPENAI_API_KEY')
  cachedClient = apiKey ? new OpenAI({ apiKey }) : null
  return cachedClient
}

function aiModel(): string {
  return readRuntimeEnv('OPENAI_SCREEN_AI_MODEL') ?? readRuntimeEnv('OPENAI_RECOMMENDATION_MODEL') ?? 'gpt-4o-mini'
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripForbidden(text: string): string {
  let out = text
  for (const token of FORBIDDEN) {
    const pattern = new RegExp(escapeRegExp(token), 'ig')
    out = out.replace(pattern, '')
  }
  return out.replace(/\s{2,}/g, ' ').trim()
}

function safeLine(value: string, fallback: string): string {
  const cleaned = stripForbidden(value)
  return cleaned.length > 0 ? cleaned : fallback
}

function safeLines(values: string[], fallback: string[]): string[] {
  const cleaned = values.map((item, i) => safeLine(item, fallback[i] ?? fallback[0]))
  return cleaned.length > 0 ? cleaned : fallback
}

function redactName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Клиент'
  return `${trimmed[0] ?? 'К'}***`
}

function redactContact(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'контакт подтвержден'
  const emailMatch = trimmed.match(/^([^@]+)@(.+)$/)
  if (emailMatch) {
    return `${emailMatch[1]?.slice(0, 1) ?? '*'}***@${emailMatch[2]}`
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 4) {
    return `***${digits.slice(-2)}`
  }
  return 'контакт подтвержден'
}

function sanitizeModelContext(value: string | undefined): string | null {
  if (!value) return null
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d\s().-]{5,}\d/g, '[phone]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

function textBlob(parts: string[]): string {
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function includesAny(text: string, words: string[]): number {
  const lower = text.toLowerCase()
  return words.reduce((count, word) => count + (lower.includes(word.toLowerCase()) ? 1 : 0), 0)
}

function numericOrHorizonHits(text: string): number {
  const matches = text.match(/\b(\d{1,3}|0–24|24–48|48–72|72)\b/g)
  return matches?.length ?? 0
}

function criterion(name: string, score: number, evidence: string) {
  return {
    name,
    score: Math.max(0, Math.min(100, Math.round(score))),
    evidence,
  }
}

function evaluateQuality(args: {
  parts: string[]
  contextTerms?: string[]
  status: QualityStatus
}): AiQuality {
  const text = textBlob(args.parts)
  const lower = text.toLowerCase()
  const contextTerms = args.contextTerms ?? []
  const contextHits = contextTerms.length === 0 ? 2 : includesAny(text, contextTerms)
  const actionHits = includesAny(lower, [
    'проверь',
    'соберите',
    'собрать',
    'фиксируйте',
    'зафиксировать',
    'закройте',
    'подготовьте',
    'зафиксируйте',
    'переключайтесь',
    'приложите',
    'добавьте',
    'выделите',
    'выделить',
    'оценить',
    'проверить',
    'уточните',
    'переходите',
  ])
  const riskHits = includesAny(lower, [
    'риск',
    'буфер',
    'дедлайн',
    'окно',
    'слот',
    'документ',
    'финанс',
    'бронь',
    'паспорт',
    'ручн',
    'задерж',
  ])
  const concreteHits =
    numericOrHorizonHits(text) +
    includesAny(lower, ['даты', 'бронь', 'выписк', 'слот', 'паспорт', 'маршрут', '72 часа', '24'])
  const genericHits = includesAny(lower, [
    'важно подготовиться',
    'обратите внимание',
    'может помочь',
    'как можно скорее',
    'лучше заранее',
    'нужно всё проверить',
  ])
  const forbiddenHits = FORBIDDEN.filter((token) => lower.includes(token.toLowerCase()))
  const nextStepHits = includesAny(lower, [
    'сегодня',
    '0–24',
    '24–48',
    '48–72',
    '72',
    'в первую очередь',
    'сначала',
    'до оплаты',
    'сегодня',
    'следующий шаг',
    'переходите',
    'переключайтесь',
    'отправкой',
  ])

  const criteria = [
    criterion(
      'Привязка к кейсу',
      contextHits >= 2 ? 96 : contextHits === 1 ? 90 : 76,
      contextHits >= 1 ? 'Ответ использует страну, срок или состояние кейса.' : 'Мало привязки к данным кейса.'
    ),
    criterion(
      'Конкретика',
      concreteHits >= 4 ? 97 : concreteHits >= 3 ? 92 : concreteHits >= 2 ? 88 : 72,
      concreteHits >= 3 ? 'Есть документы, сроки или проверяемые сущности.' : 'Недостаточно проверяемых деталей.'
    ),
    criterion(
      'Действие',
      actionHits >= 3 ? 97 : actionHits >= 2 ? 92 : actionHits === 1 ? 86 : 70,
      actionHits >= 2 ? 'Формулировки переводят пользователя в действие.' : 'Слабая операционная инструкция.'
    ),
    criterion(
      'Риск',
      riskHits >= 4 ? 97 : riskHits >= 3 ? 93 : riskHits >= 2 ? 88 : 70,
      riskHits >= 3 ? 'Риск назван через сроки, документы или слот.' : 'Риск звучит слишком общо.'
    ),
    criterion(
      'Следующий шаг',
      nextStepHits >= 2 ? 97 : nextStepHits === 1 ? 90 : 76,
      nextStepHits >= 1 ? 'Понятно, что делать дальше.' : 'Нет явного ближайшего шага.'
    ),
    criterion(
      'Доктрина и небанальность',
      forbiddenHits.length === 0 && genericHits === 0 ? 98 : forbiddenHits.length === 0 && genericHits === 1 ? 88 : 55,
      forbiddenHits.length === 0 ? 'Нет запрещённых обещаний и пустых клише.' : 'Есть запрещённая или рискованная формулировка.'
    ),
  ]

  const score = Math.round(criteria.reduce((sum, item) => sum + item.score, 0) / criteria.length)
  return aiQualitySchema.parse({
    score,
    threshold: AI_QUALITY_THRESHOLD,
    status: score >= AI_QUALITY_THRESHOLD ? args.status : 'fallback_upgraded',
    label: score >= AI_QUALITY_THRESHOLD ? 'Готово для публичного интерфейса' : 'Заменено на экспертный текст',
    criteria,
  })
}

function withQuality<TDraft extends { source: 'ai_structured' | 'deterministic_recovery' }>(args: {
  draft: TDraft
  parts: string[]
  contextTerms?: string[]
  status: QualityStatus
}): TDraft & { quality: AiQuality } {
  return {
    ...args.draft,
    quality: evaluateQuality({
      parts: args.parts,
      contextTerms: args.contextTerms,
      status: args.status,
    }),
  }
}

function qualityPassed(output: { quality: AiQuality }): boolean {
  return output.quality.score >= AI_QUALITY_THRESHOLD
}

function stripQuality<TDraft>(value: TDraft & { quality: AiQuality }): TDraft {
  const { quality: _quality, ...rest } = value
  return rest as TDraft
}

async function structuredResponse<T>(args: {
  schema: Parameters<typeof zodTextFormat>[0]
  formatName: string
  system: string
  user: string
}): Promise<T | null> {
  const client = getClient()
  if (!client) return null

  try {
    const response = await client.responses.create({
      model: aiModel(),
      input: [
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
      text: {
        format: zodTextFormat(args.schema, args.formatName),
      },
    })

    if (!response.output_text) return null
    return JSON.parse(response.output_text) as T
  } catch {
    return null
  }
}

function fallbackLanding(input: LandingAiInput): LandingAiOutput {
  const country = input.country ? COUNTRY_LABEL[input.country] : 'ваша страна'
  const draft = {
    source: 'deterministic_recovery',
    title: 'Фокус: не страна, а узкое место',
    bullets: [
      `${country}: проверьте окно подачи`,
      'Соберите финансы, даты, бронь, маршрут',
      'Уточните слот; риск в датах — эксперту',
    ],
    note: 'Следующий шаг сегодня: проверьте окно подачи.',
  } satisfies LandingAiOutput

  return stripQuality(withQuality({
    draft,
    parts: [draft.title, ...draft.bullets, draft.note],
    contextTerms: input.country ? [COUNTRY_LABEL[input.country]] : [],
    status: 'fallback_upgraded',
  }))
}

export async function buildLandingAi(input: LandingAiInput): Promise<LandingAiOutput> {
  const fallback = fallbackLanding(input)
  const raw = await structuredResponse<LandingAiDraft>({
    schema: landingAiDraftSchema,
    formatName: 'landing_ai',
    system: `Ты продуктовый AI-копилот визового сервиса. ${EXPERT_SYSTEM_RULES} Верни 3 bullets: каждый должен содержать конкретный риск, действие или проверяемую деталь.`,
    user: JSON.stringify(
      {
        task: 'Собери вау-блок для landing-экрана.',
        constraints: {
          bullets: 3,
          tone: 'премиальный, экспертный, практичный, без банальности',
          maxVisibleCharsPerBullet: 54,
        },
        context: {
          country: input.country ? COUNTRY_LABEL[input.country] : null,
        },
      },
      null,
      2
    ),
  })

  if (!raw) return fallback

  const parsed = landingAiDraftSchema.safeParse(raw)
  if (!parsed.success) return fallback

  const draft = {
    source: 'ai_structured',
    title: safeLine(parsed.data.title, fallback.title),
    bullets: safeLines(parsed.data.bullets, fallback.bullets),
    note: safeLine(parsed.data.note, fallback.note),
  } satisfies LandingAiOutput

  const candidate = withQuality({
    draft,
    parts: [draft.title, ...draft.bullets, draft.note],
    contextTerms: input.country ? [COUNTRY_LABEL[input.country]] : [],
    status: 'expert_ready',
  })

  return qualityPassed(candidate) ? stripQuality(candidate) : fallback
}

function fallbackIntake(input: IntakeAiInput): IntakeAiOutput {
  const country = input.country ? COUNTRY_LABEL[input.country] : 'стране назначения'
  const draft = {
    source: 'deterministic_recovery',
    title: 'AI Формулировка без потерь',
    rewrite:
      `Прошу повторно рассмотреть кейс для поездки в ${country}: маршрут, даты, бронь проживания и финансовые подтверждения собраны в одну непротиворечивую версию. Готов предоставить недостающий документ сегодня, чтобы снять риск задержки.`,
    proofPoints: [
      'Приложите выписку за последние 3 месяца и справку о занятости одним пакетом.',
      'Добавьте короткую логику маршрута: даты, город, проживание, обратный билет.',
      'Проверьте совпадение ФИО, дат и номера паспорта во всех бронях и выписках.',
    ].slice(0, 3),
    riskAngle: 'Главный риск: документы выглядят фрагментированно или противоречат датам поездки, поэтому эксперт сначала проверяет целостность пакета.',
  } satisfies IntakeAiOutput

  return stripQuality(withQuality({
    draft,
    parts: [draft.title, draft.rewrite, ...draft.proofPoints, draft.riskAngle],
    contextTerms: input.country ? [COUNTRY_LABEL[input.country]] : [],
    status: 'fallback_upgraded',
  }))
}

export async function buildIntakeAi(input: IntakeAiInput): Promise<IntakeAiOutput> {
  const fallback = fallbackIntake(input)
  const raw = await structuredResponse<IntakeAiDraft>({
    schema: intakeAiDraftSchema,
    formatName: 'intake_ai',
    system: `Ты помощник топ-эксперта по подготовке визового кейса. ${EXPERT_SYSTEM_RULES} Улучши формулировку спокойно, без агрессии, с проверяемыми proof-points и конкретным риском.`,
    user: JSON.stringify(
      {
        task: 'Перепиши пользовательский контекст отказа и добавь 2-3 проверяемых proof-point.',
        constraints: {
          rewriteMaxChars: 320,
          proofPoints: '2-3 пункта',
          outputStyle: 'short expert rewrite, no generic reassurance',
        },
        context: {
          country: input.country ? COUNTRY_LABEL[input.country] : null,
          purpose: input.purpose ?? null,
          refusalContext: input.refusalContext,
        },
      },
      null,
      2
    ),
  })

  if (!raw) return fallback

  const parsed = intakeAiDraftSchema.safeParse(raw)
  if (!parsed.success) return fallback

  const draft = {
    source: 'ai_structured',
    title: safeLine(parsed.data.title, fallback.title),
    rewrite: safeLine(parsed.data.rewrite, fallback.rewrite),
    proofPoints: safeLines(parsed.data.proofPoints, fallback.proofPoints),
    riskAngle: safeLine(parsed.data.riskAngle, fallback.riskAngle),
  } satisfies IntakeAiOutput

  const candidate = withQuality({
    draft,
    parts: [draft.title, draft.rewrite, ...draft.proofPoints, draft.riskAngle],
    contextTerms: input.country ? [COUNTRY_LABEL[input.country]] : [],
    status: 'expert_ready',
  })

  return qualityPassed(candidate) ? stripQuality(candidate) : fallback
}

function fallbackResult(input: ResultAiInput): ResultAiOutput {
  const country = COUNTRY_LABEL[input.country]
  const draft = {
    source: 'deterministic_recovery',
    title: 'AI-фокус: снять один риск, не раздувать пакет',
    timeline: [
      {
        horizon: '0–24 ч',
        action: `${country}: проверьте даты, бронь, билеты и выписку.`,
      },
      {
        horizon: '24–48 ч',
        action: 'Зафиксируйте слот или резервный сценарий подачи.',
      },
      {
        horizon: '48–72 ч',
        action: 'Соберите финальный пакет перед оплатой и отправкой.',
      },
    ],
    contrarian: 'Не добавляйте документы “для веса”: сначала уберите противоречие в датах, деньгах и маршруте.',
    tripwire:
      input.daysToTrip <= 14
        ? 'Если сегодня нет финального пакета, ведите кейс к эксперту.'
        : `Триггер: ${input.topRisk}`,
  } satisfies ResultAiOutput

  return stripQuality(withQuality({
    draft,
    parts: [
      draft.title,
      ...draft.timeline.flatMap((item) => [item.horizon, item.action]),
      draft.contrarian,
      draft.tripwire,
    ],
    contextTerms: [country, input.verdict, String(input.daysToTrip)],
    status: 'fallback_upgraded',
  }))
}

export async function buildResultAi(input: ResultAiInput): Promise<ResultAiOutput> {
  const fallback = fallbackResult(input)
  const raw = await structuredResponse<ResultAiDraft>({
    schema: resultAiDraftSchema,
    formatName: 'result_ai',
    system: `Ты стратег топ-уровня по визовым кейсам. ${EXPERT_SYSTEM_RULES} Нужен практичный план на 72 часа: 3 шага по времени, один контринсайт, один триггер риска. Каждый шаг должен быть операционным, а не общим.`,
    user: JSON.stringify(
      {
        task: 'Собери стратегический AI-блок для result-экрана.',
        context: {
          country: COUNTRY_LABEL[input.country],
          verdict: input.verdict,
          daysToTrip: input.daysToTrip,
          departureDate: input.departureDate ?? null,
          returnDate: input.returnDate ?? null,
          topRisk: input.topRisk,
          missingItems: input.missingItems ?? [],
          outputStyle: 'short premium signal, no long paragraphs',
        },
      },
      null,
      2
    ),
  })

  if (!raw) return fallback

  const parsed = resultAiDraftSchema.safeParse(raw)
  if (!parsed.success) return fallback

  const draft = {
    source: 'ai_structured',
    title: safeLine(parsed.data.title, fallback.title),
    timeline: parsed.data.timeline.map((item, idx) => ({
      horizon: safeLine(item.horizon, fallback.timeline[idx]?.horizon ?? fallback.timeline[0].horizon),
      action: safeLine(item.action, fallback.timeline[idx]?.action ?? fallback.timeline[0].action),
    })),
    contrarian: safeLine(parsed.data.contrarian, fallback.contrarian),
    tripwire: safeLine(parsed.data.tripwire, fallback.tripwire),
  } satisfies ResultAiOutput

  const candidate = withQuality({
    draft,
    parts: [
      draft.title,
      ...draft.timeline.flatMap((item) => [item.horizon, item.action]),
      draft.contrarian,
      draft.tripwire,
    ],
    contextTerms: [COUNTRY_LABEL[input.country], input.verdict, String(input.daysToTrip)],
    status: 'expert_ready',
  })

  return qualityPassed(candidate) ? stripQuality(candidate) : fallback
}

function fallbackHumanReview(input: HumanReviewAiInput): HumanReviewAiOutput {
  const country = input.country ? COUNTRY_LABEL[input.country] : 'направлению поездки'
  const safeName = redactName(input.fullName)
  const safeContact = redactContact(input.contact)
  const draft = {
    source: 'deterministic_recovery',
    title: 'AI Бриф для эксперта',
    urgency: input.verdict === 'HUMAN_REVIEW' ? 'Срочность: высокая' : 'Срочность: стандартная',
    blockers: [
      `Нужна ручная проверка по ${country}: сначала оценить временной буфер, слот подачи и риск возврата паспорта после дедлайна.`,
      'Проверить целостность пакета: даты поездки, бронь жилья, билеты, выписка и контакт для связи должны быть в одной версии.',
      'Перед отправкой эксперту выделить один главный риск и один документ, который надо усилить сегодня.',
    ],
    expertQuestions: [
      'Какой один документ сейчас критичнее всего усилить в первую очередь и почему?',
      'Какой план действий на ближайшие 72 часа самый безопасный с учётом дедлайна?',
      'Какая формулировка запроса минимизирует риск задержки без обещаний по исходу?',
    ],
    packetSummary: `Клиент ${safeName} просит экспертную проверку. Контакт: ${safeContact}. Приоритет: снять риск по срокам, документам и следующему действию за 72 часа.`,
  } satisfies HumanReviewAiOutput

  return stripQuality(withQuality({
    draft,
    parts: [
      draft.title,
      draft.urgency,
      ...draft.blockers,
      ...draft.expertQuestions,
      draft.packetSummary,
    ],
    contextTerms: input.country ? [COUNTRY_LABEL[input.country]] : undefined,
    status: 'fallback_upgraded',
  }))
}

export async function buildHumanReviewAi(input: HumanReviewAiInput): Promise<HumanReviewAiOutput> {
  const fallback = fallbackHumanReview(input)
  const raw = await structuredResponse<HumanReviewAiDraft>({
    schema: humanReviewAiDraftSchema,
    formatName: 'human_review_ai',
    system: `Ты готовишь handoff-пакет для эксперта-человека. ${EXPERT_SYSTEM_RULES} Нужны: уровень срочности, 2-3 блокера, 3 точных вопроса эксперту и summary. Каждый блокер должен быть проверяемым.`,
    user: JSON.stringify(
      {
        task: 'Собери AI-бриф для human-review экрана.',
        context: {
          country: input.country ? COUNTRY_LABEL[input.country] : null,
          verdict: input.verdict ?? null,
          departureDate: input.departureDate ?? null,
          returnDate: input.returnDate ?? null,
          contact: redactContact(input.contact),
          context: sanitizeModelContext(input.context),
          outputStyle: 'operator brief, concise and specific',
        },
      },
      null,
      2
    ),
  })

  if (!raw) return fallback

  const parsed = humanReviewAiDraftSchema.safeParse(raw)
  if (!parsed.success) return fallback

  const draft = {
    source: 'ai_structured',
    title: safeLine(parsed.data.title, fallback.title),
    urgency: safeLine(parsed.data.urgency, fallback.urgency),
    blockers: safeLines(parsed.data.blockers, fallback.blockers),
    expertQuestions: safeLines(parsed.data.expertQuestions, fallback.expertQuestions),
    packetSummary: safeLine(parsed.data.packetSummary, fallback.packetSummary),
  } satisfies HumanReviewAiOutput

  const candidate = withQuality({
    draft,
    parts: [
      draft.title,
      draft.urgency,
      ...draft.blockers,
      ...draft.expertQuestions,
      draft.packetSummary,
    ],
    contextTerms: input.country ? [COUNTRY_LABEL[input.country]] : undefined,
    status: 'expert_ready',
  })

  return qualityPassed(candidate) ? stripQuality(candidate) : fallback
}
