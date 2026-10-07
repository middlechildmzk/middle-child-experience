import { ImageResponse } from 'next/og';

export function editorialShareImage(title: string, description: string) {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '64px 72px', background: '#15101f', color: '#f7f7f2' }}>
      <div style={{ display: 'flex', fontSize: 28, letterSpacing: '0.15em', color: '#e66bff' }}>BVSS FVM</div>
      <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
      <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.35, color: '#d8d5df' }}>{description}</div>
    </div>, { width: 1200, height: 630 },
  );
}
