import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#1a1a1a',
          display: 'flex',
          flexWrap: 'wrap',
          padding: 24,
          gap: 12,
          alignContent: 'flex-start',
        }}
      >
        <div style={{ width: 60, height: 60, background: 'white', borderRadius: 12 }} />
        <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.4)', borderRadius: 12 }} />
        <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.4)', borderRadius: 12 }} />
        <div style={{ width: 60, height: 60, background: 'white', borderRadius: 12 }} />
      </div>
    ),
    { ...size }
  )
}
