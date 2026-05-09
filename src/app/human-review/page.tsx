import { Suspense } from 'react'
import { HumanReviewPageClient } from './HumanReviewPageClient'

export default function HumanReviewPage() {
  return (
    <Suspense fallback={null}>
      <HumanReviewPageClient />
    </Suspense>
  )
}
