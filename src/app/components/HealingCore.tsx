'use client';

import { useEffect, useState } from 'react';

export default function HealingCore() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const update = () => {
      const section = document.getElementById('never-alone');
      const lyrics = document.querySelector<HTMLElement>('.lyrics-section');
      if (!section) return;

      const start = section.offsetTop - window.innerHeight * 0.72;
      const end = (lyrics?.offsetTop ?? section.offsetTop + section.offsetHeight) - window.innerHeight * 0.2;
      const next = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start)));
      setProgress(reduced ? (next > 0.25 ? 1 : 0) : next);
      setVisible(next > 0.01 && next < 0.995);
      document.documentElement.style.setProperty('--healing-progress', next.toFixed(3));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const stage = progress < 0.28 ? 'fractured' : progress < 0.68 ? 'repairing' : 'radiant';

  return (
    <aside className={`healing-core-shell ${visible ? 'is-visible' : ''} stage-${stage}`} aria-hidden="true">
      <div className="healing-core-aura" />
      <div className="healing-core-orbit orbit-a" />
      <div className="healing-core-orbit orbit-b" />
      <div className="healing-core">
        <span className="heart-lobe heart-lobe-left" />
        <span className="heart-lobe heart-lobe-right" />
        <span className="heart-point" />
        <i className="heart-crack crack-one" />
        <i className="heart-crack crack-two" />
        <i className="heart-crack crack-three" />
        <b className="repair-line repair-one" />
        <b className="repair-line repair-two" />
        <b className="repair-line repair-three" />
      </div>
      <div className="healing-particles">
        {Array.from({ length: 14 }).map((_, index) => <span key={index} style={{ '--particle': index } as React.CSSProperties} />)}
      </div>
      <p>{stage === 'fractured' ? 'broken' : stage === 'repairing' ? 'held together' : 'alive again'}</p>
    </aside>
  );
}
