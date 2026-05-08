'use client'

import { cn } from '@/lib/utils'

type VerdictKind = 'GO' | 'GO_WITH_CONDITIONS' | 'NOT_NOW' | 'HUMAN_REVIEW'

type RouteMapProps = {
  verdict?: VerdictKind
  forceStop?: 1 | 2 | 3 | 4
  className?: string
}

function stopFromVerdict(v?: VerdictKind): 1 | 2 | 3 | 4 {
  if (v === 'GO') return 4
  if (v === 'GO_WITH_CONDITIONS') return 3
  if (v === 'NOT_NOW') return 3
  if (v === 'HUMAN_REVIEW') return 2
  return 2
}

function stopColor(v?: VerdictKind) {
  if (v === 'GO') return '#34d399'
  if (v === 'NOT_NOW') return '#fb923c'
  return '#ff8a2a'
}

export function RouteMap({ verdict, forceStop, className }: RouteMapProps) {
  const active = forceStop ?? stopFromVerdict(verdict)
  const accent = stopColor(verdict)
  const stops = [
    { x: 45, y: 130, n: 1, label: '—' },
    { x: 150, y: 55, n: 2, label: 'Документы' },
    { x: 250, y: 115, n: 3, label: 'Окно подачи' },
    { x: 345, y: 60, n: 4, label: 'Шенген' },
  ] as const

  return (
    <div className={cn('relative w-full', className)}>
      <svg viewBox="0 0 380 200" className="h-[230px] w-full">
        <defs>
          <linearGradient id="routeActive" x1="0" y1="0" x2="380" y2="0">
            <stop offset="0" stopColor="#3a3530" stopOpacity=".4" />
            <stop offset=".4" stopColor={accent} stopOpacity=".9" />
            <stop offset=".7" stopColor="#ffd9a8" />
            <stop offset="1" stopColor="#3a3530" stopOpacity=".4" />
          </linearGradient>
          <filter id="routeGlow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <path
          d="M 45 130 C 90 70, 120 30, 150 55 S 210 155, 250 115 S 320 30, 345 60"
          fill="none"
          stroke="#2a2622"
          strokeWidth="1.8"
          strokeDasharray="3 4"
        />
        <path
          d="M 45 130 C 90 70, 120 30, 150 55 S 210 155, 250 115 S 320 30, 345 60"
          fill="none"
          stroke="url(#routeActive)"
          strokeWidth="3.5"
          filter="url(#routeGlow)"
          opacity=".95"
        />
        {stops.map((s) => {
          const isActive = s.n === active
          return (
            <g key={s.n}>
              {isActive && (
                <circle cx={s.x} cy={s.y} r="28" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.3">
                  <animate attributeName="r" from="22" to="32" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={s.x}
                cy={s.y}
                r="20"
                fill={isActive ? '#1a1410' : '#15171c'}
                stroke={isActive ? accent : '#2a2622'}
                strokeWidth={isActive ? 2.4 : 1.5}
                style={isActive ? { filter: `drop-shadow(0 0 12px ${accent}c0)` } : undefined}
              />
              <text
                x={s.x}
                y={s.y + 6}
                textAnchor="middle"
                fontSize="17"
                fontWeight="700"
                fill={isActive ? '#ffb35f' : '#5a606a'}
              >
                {s.n}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="-mt-10 grid grid-cols-4 items-start">
        {stops.map((s) => (
          <div key={s.n} className="px-1 text-center leading-none">
            <div
              className={cn(
                'text-[12.5px] font-medium leading-tight',
                s.n === active ? 'text-primary' : 'text-foreground/70'
              )}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
