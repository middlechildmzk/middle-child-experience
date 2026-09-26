import { ImageResponse } from 'next/og';
import { guideBySlug } from '../../../lib/learn-guides';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);

  const title = guide?.title || 'BVSS FVM Editorial';
  const eyebrow = guide?.eyebrow || 'BVSS FVM';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          color: '#f7f7f2',
          background:
            'radial-gradient(circle at 82% 12%, rgba(185,108,255,.55), transparent 30%), radial-gradient(circle at 12% 84%, rgba(124,248,255,.22), transparent 34%), #08090d',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '0.18em',
              color: '#e66bff',
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: '0.18em',
            }}
          >
            BVSS FVM
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 980 }}>
          <div
            style={{
              fontSize: 78,
              lineHeight: 0.98,
              letterSpacing: '-0.045em',
              fontWeight: 900,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: '#d8d5df',
              maxWidth: 900,
            }}
          >
            Electronic music, playlist curation, and independent artist discovery.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 20,
            color: '#aaa6b3',
          }}
        >
          <span>bvssfvm.com/learn</span>
          <span>•</span>
          <span>Human-curated electronic music</span>
        </div>
      </div>
    ),
    size,
  );
}
