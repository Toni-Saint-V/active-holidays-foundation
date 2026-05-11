'use client'

import { useEffect } from 'react'

export function AutoMotion() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    function syncMotionPreference() {
      document.documentElement.dataset.motion = media.matches ? 'reduced' : 'auto'
    }

    syncMotionPreference()
    media.addEventListener('change', syncMotionPreference)

    return () => {
      media.removeEventListener('change', syncMotionPreference)
      delete document.documentElement.dataset.motion
    }
  }, [])

  return null
}
