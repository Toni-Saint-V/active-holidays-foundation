import { Suspense } from 'react'
import { CalculatingPageClient } from './CalculatingPageClient'

export default function CalculatingPage() {
  return (
    <Suspense fallback={null}>
      <CalculatingPageClient />
    </Suspense>
  )
}
