import { ImageResponse } from 'next/og'
import { OG } from '@/lib/seo'

export const runtime = 'nodejs'
export const alt = OG.alt
export const size = { width: OG.width, height: OG.height }
export const contentType = 'image/png'

/**
 * The social / link-preview card. Rendered once at build time rather than
 * shipped as a static PNG so the score, the claim and the brand wordmark can
 * never fall out of sync with the product copy.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #0b1220 0%, #1b1b4b 45%, #3b1d6e 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #00C4FF 0%, #0070F3 52%, #8A2BE2 100%)',
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            C
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.6 }}>CalibiUpX</div>
            <div style={{ fontSize: 15, letterSpacing: 4, color: '#9aa7d4' }}>ASSESS · ELEVATE · GET HIRED</div>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.06, letterSpacing: -2 }}>
            Your verified
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.06,
              letterSpacing: -2,
              backgroundImage: 'linear-gradient(135deg, #00C4FF 0%, #7aa2ff 50%, #c084fc 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            employability score.
          </div>
          <div style={{ fontSize: 27, color: '#c3cbe8', maxWidth: 840, lineHeight: 1.4 }}>
            One AI-scored assessment out of 1000 · 50+ company mock tests on real hiring
            patterns · a credential recruiters can verify.
          </div>
        </div>

        {/* proof row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {['1000-point score', '50+ company mocks', 'Proctored', 'Verified PDF'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                fontSize: 21,
                fontWeight: 700,
                padding: '12px 22px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#e6ebff',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
