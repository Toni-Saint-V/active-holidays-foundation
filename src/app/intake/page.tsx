import { Suspense } from 'react'
import { IntakePageClient } from './IntakePageClient'

export default function IntakePage() {
  return (
    <Suspense fallback={null}>
      <IntakePageClient />
    </Suspense>
  )
}
