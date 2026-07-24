'use client';

import { useEffect, useState } from 'react';

const sections = ['top', 'never-alone', 'music', 'story', 'creators'];

export default function ExperienceControls() {
  const [active, setActive] = useState('top');
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.card, .story-card, .feature'));

    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible')),
      { threshold: 0.14 },
    );

    cards.forEach((card) => {
      card.classList.add('reveal-item');
      revealObserver.observe(card);

      if (!reduced) {
        const move = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.setProperty('--tilt-x', `${y * -5}deg`);
          card.style.setProperty('--tilt-y', `${x * 6}deg`);
          card.style.setProperty('--shine-x', `${(x + 0.5) * 100}%`);
          card.style.setProperty('--shine-y', `${(y + 0.5) * 100}%`);
        };
        const leave = () => {
          card.style.setProperty('--tilt-x', '0deg');
          card.style.setProperty('--tilt-y', '0deg');
        };
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        return () => {
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
        };
      }
    });

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -55%', threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) sectionObserver.observe(element);
    });

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <>
      <aside className="journey-rail" aria-label="Page progress">
        {sections.map((id) => (
          <a key={id} href={`#${id}`} className={active === id ? 'active' : ''} aria-label={`Jump to ${id.replace('-', ' ')}`}>
            <span />
          </a>
        ))}
      </aside>

      <div className={`release-player ${playerOpen ? 'open' : ''}`}>
        <button className="player-toggle" type="button" onClick={() => setPlayerOpen((value) => !value)} aria-expanded={playerOpen}>
          <span className="player-pulse" aria-hidden="true" />
          <span><small>Featured release</small><strong>Never Alone</strong></span>
          <b>{playerOpen ? '×' : '↗'}</b>
        </button>
        <div className="player-panel">
          <div className="player-art" aria-hidden="true"><span>✦</span></div>
          <div className="player-copy">
            <small>Middle Child feat. lowly sunday</small>
            <strong>Never Alone</strong>
            <p>Arriving July 31, 2026</p>
            <div className="player-line"><span /></div>
          </div>
          <a href="https://distrokid.com/hyperfollow/middlechild7/never-alone-feat-low-sunday/" target="_blank" rel="noreferrer">Pre-save ↗</a>
        </div>
      </div>
    </>
  );
}
