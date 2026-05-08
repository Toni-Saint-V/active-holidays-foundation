export function PlaneMotif() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-10 -top-6 h-[280px] w-[280px] opacity-90 ah-plane-mask md:h-[420px] md:w-[420px]"
    >
      <defs>
        <linearGradient id="planeBody" x1="0" y1="0" x2="0" y2="200">
          <stop offset="0" stopColor="#ffd9a8" />
          <stop offset="1" stopColor="#62380a" />
        </linearGradient>
      </defs>
      <g transform="translate(60 60) rotate(-22)">
        <path
          d="M 6 40 L 56 36 L 76 16 Q 80 12 86 16 L 78 40 L 96 50 L 78 60 L 86 84 Q 80 88 76 84 L 56 64 L 6 60 Q 2 50 6 40 Z"
          fill="url(#planeBody)"
          stroke="oklch(0.85 0.13 55 / 0.4)"
          strokeWidth="0.8"
        />
        <path
          d="M 6 50 Q -10 70 4 88"
          stroke="oklch(0.78 0.17 55 / 0.4)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="3 4"
        />
      </g>
    </svg>
  )
}
