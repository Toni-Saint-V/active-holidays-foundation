import { Suspense } from 'react'
import { ResultPageClient } from './ResultPageClient'

export default function ResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultPageClient />
    </Suspense>
  )
}
