'use client';

import { useEffect, useRef, useState } from 'react';

type Particle = { x:number; y:number; z:number; size:number; alpha:number; drift:number };

const worlds = [
  { id: 'top', name: 'Never Alone', className: 'world-never-alone' },
  { id: 'never-alone', name: 'The Healing', className: 'world-healing' },
  { id: 'music', name: 'Release Worlds', className: 'world-catalog' },
  { id: 'story', name: 'Memory', className: 'world-memory' },
  { id: 'creators', name: 'Open Signal', className: 'world-signal' },
];

export default function ImmersiveEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [world, setWorld] = useState(worlds[0]);
  const [discovery, setDiscovery] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let scrollVelocity = 0;
    let previousScroll = window.scrollY;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let shooting = { active:false, x:0, y:0, vx:0, vy:0, life:0 };

    const particles: Particle[] = Array.from({ length: reduced ? 70 : 190 }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random(), size: .35 + Math.random() * 1.7,
      alpha: .18 + Math.random() * .75, drift: (Math.random() - .5) * .00016,
    }));

    const resize = () => {
      width = window.innerWidth; height = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pointer = (event: PointerEvent) => { pointerX = event.clientX; pointerY = event.clientY; };
    const scroll = () => {
      scrollVelocity += Math.min(30, Math.abs(window.scrollY - previousScroll)) * .014;
      previousScroll = window.scrollY;
    };

    const launchShootingStar = () => {
      if (shooting.active || reduced) return;
      shooting = { active:true, x:-80, y:height * (.15 + Math.random() * .38), vx:10 + Math.random() * 5, vy:2 + Math.random() * 2, life:1 };
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      scrollVelocity *= .92;
      const pullRadius = Math.min(width, height) * .24;

      particles.forEach((star) => {
        star.y += star.drift + scrollVelocity * .00011 * (1.2 - star.z);
        if (star.y > 1.05) star.y = -.04;
        if (star.y < -.05) star.y = 1.04;

        let x = star.x * width;
        let y = star.y * height;
        const dx = pointerX - x;
        const dy = pointerY - y;
        const distance = Math.hypot(dx, dy);
        if (!reduced && distance < pullRadius) {
          const force = (1 - distance / pullRadius) * 15 * (1.1 - star.z);
          x += dx / Math.max(distance, 1) * force;
          y += dy / Math.max(distance, 1) * force;
        }
        const streak = 1 + scrollVelocity * (1.2 - star.z) * 1.8;
        context.beginPath();
        context.moveTo(x, y - streak);
        context.lineTo(x, y + streak);
        context.lineWidth = star.size * (1.25 - star.z * .55);
        context.strokeStyle = `rgba(222,230,255,${star.alpha * (1 - star.z * .35)})`;
        context.stroke();
      });

      if (shooting.active) {
        shooting.x += shooting.vx; shooting.y += shooting.vy; shooting.life -= .008;
        const gradient = context.createLinearGradient(shooting.x - 150, shooting.y - 40, shooting.x, shooting.y);
        gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(1, `rgba(255,255,255,${shooting.life})`);
        context.beginPath(); context.moveTo(shooting.x - 150, shooting.y - 40); context.lineTo(shooting.x, shooting.y);
        context.strokeStyle = gradient; context.lineWidth = 2; context.stroke();
        context.beginPath(); context.arc(shooting.x, shooting.y, 2.5, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${shooting.life})`; context.fill();
        if (shooting.x > width + 180 || shooting.life <= 0) shooting.active = false;
      }
      frame = requestAnimationFrame(draw);
    };

    const observers = worlds.map((entry) => {
      const target = document.getElementById(entry.id);
      if (!target) return null;
      const observer = new IntersectionObserver(([item]) => {
        if (!item.isIntersecting) return;
        setWorld(entry);
        document.body.dataset.world = entry.className;
        if (entry.id === 'story' && Math.random() > .45) launchShootingStar();
      }, { rootMargin:'-38% 0px -48%', threshold:.04 });
      observer.observe(target);
      return observer;
    });

    const discover = (event: PointerEvent) => {
      if (!shooting.active) return;
      if (Math.hypot(event.clientX - shooting.x, event.clientY - shooting.y) < 90) setDiscovery(true);
    };

    resize(); draw();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointer, { passive:true });
    window.addEventListener('pointerdown', discover);
    window.addEventListener('scroll', scroll, { passive:true });
    const shootingTimer = window.setInterval(launchShootingStar, 18000);

    return () => {
      cancelAnimationFrame(frame); clearInterval(shootingTimer);
      observers.forEach((observer) => observer?.disconnect());
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('pointerdown', discover);
      window.removeEventListener('scroll', scroll);
    };
  }, []);

  return (
    <>
      <div className="immersive-engine" aria-hidden="true">
        <canvas ref={canvasRef} className="immersive-canvas" />
        <div className="world-nebula" />
        <div className="world-vignette" />
        <div className="constellation-overlay"><i/><i/><i/><i/><i/></div>
      </div>
      <div className="world-indicator" aria-live="polite"><span>Current world</span><strong>{world.name}</strong></div>
      {discovery && (
        <div className="discovery-modal" role="dialog" aria-modal="true" aria-label="Hidden discovery">
          <button type="button" onClick={() => setDiscovery(false)} aria-label="Close discovery">×</button>
          <span>Hidden signal · 01</span>
          <h2>You noticed the light.</h2>
          <p>Some things only reveal themselves to people who stay curious. This world will keep growing with every release.</p>
          <a href="#never-alone" onClick={() => setDiscovery(false)}>Return to the story ↓</a>
        </div>
      )}
    </>
  );
}
