'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ExperienceCanvas = dynamic(() => import('./experience/ExperienceCanvas'), { ssr: false });

// Camera stations around the desk; `scene` matches a key of CHAPTER_CAMERA.
const VIEWS = [
  { id: 'home', label: 'Home', scene: 'hub' },
  { id: 'work', label: 'Selected work', scene: 'map' },
  { id: 'about', label: 'About', scene: 'loadout' },
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
