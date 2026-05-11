import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #020712 0%, #111a2f 60%, #1a2339 100%)',
          color: '#f7a34d',
          fontSize: 250,
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
