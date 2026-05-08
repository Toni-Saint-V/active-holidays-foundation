import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { FORBIDDEN } from '@/lib/forbiddenCopy'
import {
  humanReviewAiOutputSchema,
  intakeAiOutputSchema,
  landingAiOutputSchema,
  resultAiOutputSchema,
  type HumanReviewAiInput,
  type HumanReviewAiOutput,
  type IntakeAiInput,
  type IntakeAiOutput,
  type LandingAiInput,
  type LandingAiOutput,
  type ResultAiInput,
  type ResultAiOutput,
} from '@/lib/aiSurfaceContracts'

const COUNTRY_LABEL: Record<'IT' | 'ES' | 'FR' | 'GR', string> = {
  IT: 'Италия',
  ES: 'Испания',
  FR: 'Франция',
  GR: 'Греция',
}

let cachedClient: OpenAI | null | undefined

function getClient(): OpenAI | null {
  if (cachedClient !== undefined) return cachedClient
  const apiKey = process.env.OPENAI_API_KEY
  cachedClient = apiKey ? new OpenAI({ apiKey }) : null
  return cachedClient
}

function aiModel(): string {
  return process.env.OPENAI_SCREEN_AI_MODEL ?? process.env.OPENAI_RECOMMENDATION_MODEL ?? 'gpt-4o-mini'
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
  return {
    source: 'fallback',
    title: 'AI Навигатор момента',
    bullets: [
      `Для направления «${country}» главный выигрыш даёт ранняя фиксация окна подачи, а не ускоренная подача в последний момент.`,
      'Сильнее всего на итог влияет не количество документов, а качество одной связки: даты, бронь и финансовые подтверждения без разрывов.',
      'Если дедлайн близко, безопаснее заранее переключаться на сценарий с ручной проверкой, чем терять дни на повторные правки.',
    ],
    note: 'Пересчёт подсказки занимает несколько секунд после выбора страны.',
  }
}

export async function buildLandingAi(input: LandingAiInput): Promise<LandingAiOutput> {
  const fallback = fallbackLanding(input)
  const raw = await structuredResponse<LandingAiOutput>({
    schema: landingAiOutputSchema,
    formatName: 'landing_ai',
    system:
      'Ты продуктовый AI-копилот визового сервиса. Пиши только на русском, коротко и конкретно. Без обещаний, без вероятностей в процентах, без слов из технобэклога.',
    user: JSON.stringify(
      {
        task: 'Собери вау-блок для landing-экрана.',
        constraints: {
          bullets: 3,
          tone: 'премиальный, практичный, без банальности',
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

  const parsed = landingAiOutputSchema.safeParse(raw)
  if (!parsed.success) return fallback

  return {
    source: 'openai',
    title: safeLine(parsed.data.title, fallback.title),
    bullets: safeLines(parsed.data.bullets, fallback.bullets),
    note: safeLine(parsed.data.note, fallback.note),
  }
}

function fallbackIntake(input: IntakeAiInput): IntakeAiOutput {
  const country = input.country ? COUNTRY_LABEL[input.country] : 'стране назначения'
  return {
    source: 'fallback',
    title: 'AI Формулировка без потерь',
    rewrite:
      `Прошу повторно рассмотреть кейс для поездки в ${country}. Я уточнил спорные пункты по документам и готов предоставить подтверждения в полном объёме в одном пакете.`,
    proofPoints: [
      'Приложите подтверждение дохода за последние 3 месяца одним архивом.',
      'Добавьте короткое объяснение логики маршрута: даты, город, проживание.',
      'Проверьте совпадение ФИО и дат во всех бронях и выписках.',
    ].slice(0, 3),
    riskAngle: 'Самая частая причина задержки — фрагментированные документы, отправленные частями.',
  }
}

export async function buildIntakeAi(input: IntakeAiInput): Promise<IntakeAiOutput> {
  const fallback = fallbackIntake(input)
  const raw = await structuredResponse<IntakeAiOutput>({
    schema: intakeAiOutputSchema,
    formatName: 'intake_ai',
    system:
      'Ты помощник по подготовке анкеты. Улучшаешь формулировку без агрессии, делаешь текст точным и спокойным. Только русский язык.',
    user: JSON.stringify(
      {
        task: 'Перепиши пользовательский контекст отказа и добавь 2-3 проверяемых proof-point.',
        constraints: {
          rewriteMaxChars: 320,
          proofPoints: '2-3 пункта',
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

  const parsed = intakeAiOutputSchema.safeParse(raw)
  if (!parsed.success) return fallback

  return {
    source: 'openai',
    title: safeLine(parsed.data.title, fallback.title),
    rewrite: safeLine(parsed.data.rewrite, fallback.rewrite),
    proofPoints: safeLines(parsed.data.proofPoints, fallback.proofPoints),
    riskAngle: safeLine(parsed.data.riskAngle, fallback.riskAngle),
  }
}

function fallbackResult(input: ResultAiInput): ResultAiOutput {
  const country = COUNTRY_LABEL[input.country]
  return {
    source: 'fallback',
    title: 'AI План атаки 72 часа',
    timeline: [
      {
        horizon: '0–24 ч',
        action: `Закройте критичный разрыв по «${country}»: проверьте даты, бронь и финансовые файлы одной версией.`,
      },
      {
        horizon: '24–48 ч',
        action: 'Соберите финальный пакет в одном порядке и заранее подготовьте резервный слот подачи.',
      },
      {
        horizon: '48–72 ч',
        action: 'Проведите финальный контроль рисков и переходите к действию по текущему вердикту без лишних итераций.',
      },
    ],
    contrarian: 'Контринтуитивно, но лишние «улучшения» в последний день чаще вредят, чем усиливают кейс.',
    tripwire:
      input.daysToTrip <= 14
        ? 'Тревожный триггер: если нет финального пакета сегодня, переключайтесь на ручную проверку без ожидания.'
        : 'Тревожный триггер: если ключевой документ не подтверждён за 72 часа, пересоберите маршрут подачи.',
  }
}

export async function buildResultAi(input: ResultAiInput): Promise<ResultAiOutput> {
  const fallback = fallbackResult(input)
  const raw = await structuredResponse<ResultAiOutput>({
    schema: resultAiOutputSchema,
    formatName: 'result_ai',
    system:
      'Ты стратег по визовым кейсам. Нужен резкий, но практичный план на 72 часа: 3 шага по времени, один контринсайт, один триггер риска. Только русский язык.',
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
        },
      },
      null,
      2
    ),
  })

  if (!raw) return fallback

  const parsed = resultAiOutputSchema.safeParse(raw)
  if (!parsed.success) return fallback

  return {
    source: 'openai',
    title: safeLine(parsed.data.title, fallback.title),
    timeline: parsed.data.timeline.map((item, idx) => ({
      horizon: safeLine(item.horizon, fallback.timeline[idx]?.horizon ?? fallback.timeline[0].horizon),
      action: safeLine(item.action, fallback.timeline[idx]?.action ?? fallback.timeline[0].action),
    })),
    contrarian: safeLine(parsed.data.contrarian, fallback.contrarian),
    tripwire: safeLine(parsed.data.tripwire, fallback.tripwire),
  }
}

function fallbackHumanReview(input: HumanReviewAiInput): HumanReviewAiOutput {
  const country = input.country ? COUNTRY_LABEL[input.country] : 'направлению поездки'
  return {
    source: 'fallback',
    title: 'AI Бриф для эксперта',
    urgency: input.verdict === 'HUMAN_REVIEW' ? 'Срочность: высокая' : 'Срочность: стандартная',
    blockers: [
      `Нужна ручная проверка по ${country} с акцентом на временной буфер и целостность пакета документов.`,
      'Требуется подтвердить, что контактные данные и формулировка запроса достаточно конкретны для быстрой обратной связи.',
      'Перед отправкой эксперту важно выделить один главный риск, чтобы не размазывать фокус.',
    ],
    expertQuestions: [
      'Какой один документ сейчас критичнее всего усилить в первую очередь?',
      'Какой план действий на ближайшие 72 часа самый безопасный с учётом дедлайна?',
      'Какая формулировка запроса к визовому центру минимизирует риск задержки?',
    ],
    packetSummary: `Клиент ${input.fullName} просит ускоренную экспертную проверку. Контакт: ${input.contact}.`,
  }
}

export async function buildHumanReviewAi(input: HumanReviewAiInput): Promise<HumanReviewAiOutput> {
  const fallback = fallbackHumanReview(input)
  const raw = await structuredResponse<HumanReviewAiOutput>({
    schema: humanReviewAiOutputSchema,
    formatName: 'human_review_ai',
    system:
      'Ты готовишь короткий handoff-пакет для эксперта-человека. Нужны: уровень срочности, 2-3 блокера, 3 точных вопроса эксперту, и summary. Только русский язык.',
    user: JSON.stringify(
      {
        task: 'Собери AI-бриф для human-review экрана.',
        context: {
          country: input.country ? COUNTRY_LABEL[input.country] : null,
          verdict: input.verdict ?? null,
          departureDate: input.departureDate ?? null,
          returnDate: input.returnDate ?? null,
          fullName: input.fullName,
          contact: input.contact,
          context: input.context ?? '',
        },
      },
      null,
      2
    ),
  })

  if (!raw) return fallback

  const parsed = humanReviewAiOutputSchema.safeParse(raw)
  if (!parsed.success) return fallback

  return {
    source: 'openai',
    title: safeLine(parsed.data.title, fallback.title),
    urgency: safeLine(parsed.data.urgency, fallback.urgency),
    blockers: safeLines(parsed.data.blockers, fallback.blockers),
    expertQuestions: safeLines(parsed.data.expertQuestions, fallback.expertQuestions),
    packetSummary: safeLine(parsed.data.packetSummary, fallback.packetSummary),
  }
}
