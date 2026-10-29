'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ExperienceCanvas = dynamic(() => import('./experience/ExperienceCanvas'), { ssr: false });

// Camera stations around the desk; `scene` matches a key of CHAPTER_CAMERA.
const VIEWS = [
  { id: 'home', label: 'Home', scene: 'hub' },
  { id: 'work', label: 'Selected work', scene: 'map' },
  { id: 'about', label: 'About', scene: 'loadout' },
  { id: 'office', label: 'Office', scene: 'office' },
  { id: 'contact', label: 'Contact', scene: 'contact' },
];

export default function PortfolioShell() {
  const [view, setView] = useState('home');
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointer = (event) => {
      pointerRef.current = { x: (event.clientX / window.innerWidth - 0.5) * 2, y: (0.5 - event.clientY / window.innerHeight) * 2 };
    };
    window.addEventListener('pointermove', handlePointer, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointer);
  }, []);

  // Wheel, arrow keys and vertical swipe step through the stations; the lock stops one gesture from skipping several.
  useEffect(() => {
    let locked = false;
    let touchY = 0;
    let timer;
    const step = (dir) => {
      if (locked) return;
      locked = true;
      timer = window.setTimeout(() => { locked = false; }, 800);
      setView((id) => VIEWS[Math.min(VIEWS.length - 1, Math.max(0, VIEWS.findIndex((item) => item.id === id) + dir))].id);
    };
    const onWheel = (event) => { if (Math.abs(event.deltaY) >= 20) step(event.deltaY > 0 ? 1 : -1); };
    const onKey = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') step(1);
      if (event.key === 'ArrowUp' || event.key === 'PageUp') step(-1);
    };
    const onTouchStart = (event) => { touchY = event.touches[0].clientY; };
    const onTouchEnd = (event) => {
      const delta = touchY - event.changedTouches[0].clientY;
      if (Math.abs(delta) > 50) step(delta > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const current = VIEWS.find((item) => item.id === view) || VIEWS[0];

  return (
    <div className="portfolio-shell is-entered is-ready">
      <ExperienceCanvas chapter={current.scene} pointerRef={pointerRef} />
      <header className="site-header">
        <button className="site-brand" type="button" onClick={() => setView('home')}><span className="brand-mark">+</span><span><b>DANH</b><small>CREATIVE DEVELOPER</small></span></button>
        <nav className="site-nav" aria-label="Camera stations">{VIEWS.map((item, index) => <button type="button" key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><span>0{index + 1}</span>{item.label}</button>)}</nav>
      </header>
    </div>
  );
}
