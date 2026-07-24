'use client';

import { useEffect, useRef, useState } from 'react';

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
};

export default function InteractiveSky() {
  const layerRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setEnabled(false);
      return;
    }

    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (!layerRef.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;
        layerRef.current?.style.setProperty('--sky-x', x.toFixed(4));
        layerRef.current?.style.setProperty('--sky-y', y.toFixed(4));
        document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
      });
    };

    const onScroll = () => {
      const progress = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 1.4));
      document.documentElement.style.setProperty('--scroll-light', progress.toFixed(3));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const addStar = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const next: Star = {
      id: Date.now() + Math.random(),
      x,
      y,
      size: 5 + Math.random() * 7,
      delay: Math.random() * 1.5,
    };
    setStars((current) => [...current.slice(-39), next]);
  };

  return (
    <>
      <div ref={layerRef} className={`interactive-sky ${enabled ? 'is-active' : ''}`} aria-hidden="true">
        <div className="sky-depth sky-depth-one" />
        <div className="sky-depth sky-depth-two" />
        <div className="cursor-aura" />
      </div>

      <section className="living-sky-shell" aria-labelledby="living-sky-title">
        <button className="living-sky" type="button" onPointerDown={addStar} aria-describedby="living-sky-note">
          <div className="living-sky-copy">
            <p className="eyebrow">Living Sky</p>
            <h2 id="living-sky-title">Leave a light behind.</h2>
            <p id="living-sky-note">Click or tap anywhere in this sky to add a star. Each light marks a moment someone chose to keep going.</p>
            <span className="living-sky-count">{stars.length} {stars.length === 1 ? 'light' : 'lights'} added this visit</span>
          </div>
          <div className="living-sky-field" aria-hidden="true">
            {stars.map((star) => (
              <span
                key={star.id}
                className="visitor-star"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  animationDelay: `${star.delay}s`,
                }}
              />
            ))}
            <span className="constellation-line line-one" />
            <span className="constellation-line line-two" />
            <span className="constellation-line line-three" />
          </div>
        </button>
      </section>
    </>
  );
}
