import { NextResponse } from 'next/server'
import { buildLandingAi } from '@/lib/aiSurfaces'
import { checkAiApiRateLimit } from '@/lib/aiApiRateLimit'
import { landingAiInputSchema } from '@/lib/aiSurfaceContracts'

export async function POST(request: Request) {
  const limited = checkAiApiRateLimit(request)
  if (limited) return limited

  const payload = await request.json().catch(() => ({}))
  const parsed = landingAiInputSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Некорректные данные.' }, { status: 400 })
  }

  const data = await buildLandingAi(parsed.data)
  return NextResponse.json(data)
}
