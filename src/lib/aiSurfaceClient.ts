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

async function callAiEndpoint<TInput, TOutput>(args: {
  path: string
  body: TInput
  parse: (value: unknown) => { success: true; data: TOutput } | { success: false }
}): Promise<TOutput> {
  const response = await fetch(args.path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.body),
  })

  if (!response.ok) {
    throw new Error(`AI endpoint error: ${response.status}`)
  }

  const raw = (await response.json()) as unknown
  const parsed = args.parse(raw)
  if (!parsed.success) {
    throw new Error('AI endpoint schema mismatch')
  }

  return parsed.data
}

export function fetchLandingAi(input: LandingAiInput): Promise<LandingAiOutput> {
  return callAiEndpoint({
    path: '/api/ai/landing',
    body: input,
    parse: (value) => landingAiOutputSchema.safeParse(value),
  })
}

export function fetchIntakeAi(input: IntakeAiInput): Promise<IntakeAiOutput> {
  return callAiEndpoint({
    path: '/api/ai/intake',
    body: input,
    parse: (value) => intakeAiOutputSchema.safeParse(value),
  })
}

export function fetchResultAi(input: ResultAiInput): Promise<ResultAiOutput> {
  return callAiEndpoint({
    path: '/api/ai/result',
    body: input,
    parse: (value) => resultAiOutputSchema.safeParse(value),
  })
}

export function fetchHumanReviewAi(input: HumanReviewAiInput): Promise<HumanReviewAiOutput> {
  return callAiEndpoint({
    path: '/api/ai/human-review',
    body: input,
    parse: (value) => humanReviewAiOutputSchema.safeParse(value),
  })
}
