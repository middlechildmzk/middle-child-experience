'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const destinations = [
  ['Music', '/music'], ['Artist', '/artists/middle-child'],
  ['Licensing', '/licensing'], ['Playlists', '/playlists'],
  ['Curators', '/curators'], ['About', '/about'],
  ['Learn', '/learn'], ['Submit', '/submit'],
] as const;

export default function HeaderNavigation() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 851px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', resize);
    };
  }, [open]);

  return (
    <div className="header-navigation" ref={container}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          toggle.current?.focus();
        }
      }}>
      <button className="nav-toggle" type="button" ref={toggle}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>
        {open ? 'Close menu' : 'Menu'}
      </button>
      <nav id="primary-navigation" className={open ? 'is-open' : ''} aria-label="Primary navigation">
        {destinations.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
    </div>
  );
}
