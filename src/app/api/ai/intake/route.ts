import { NextResponse } from 'next/server'
import { buildIntakeAi } from '@/lib/aiSurfaces'
import { intakeAiInputSchema } from '@/lib/aiSurfaceContracts'

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}))
  const parsed = intakeAiInputSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Некорректные данные.' }, { status: 400 })
  }

  const data = await buildIntakeAi(parsed.data)
  return NextResponse.json(data)
}
