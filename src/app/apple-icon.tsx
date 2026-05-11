import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          background: 'linear-gradient(155deg, #020712 0%, #131d34 58%, #1c2740 100%)',
          color: '#f7a34d',
          fontSize: 96,
          fontWeight: 700,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        A
      </div>
    ),
    size
  )
}
