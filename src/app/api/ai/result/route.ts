import { NextResponse } from 'next/server'
import { buildResultAi } from '@/lib/aiSurfaces'
import { resultAiInputSchema } from '@/lib/aiSurfaceContracts'

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}))
  const parsed = resultAiInputSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Некорректные данные.' }, { status: 400 })
  }

  const data = await buildResultAi(parsed.data)
  return NextResponse.json(data)
}
