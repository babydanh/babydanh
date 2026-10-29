'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import SiteClock from './SiteClock';

const ExperienceCanvas = dynamic(() => import('./experience/ExperienceCanvas'), { ssr: false });

// Camera stations around the desk; `scene` matches a key of CHAPTER_CAMERA.
const VIEWS = [
  { id: 'home', label: 'Home', scene: 'hub' },
  { id: 'work', label: 'Selected work', scene: 'map' },
  { id: 'about', label: 'About', scene: 'loadout' },
  { id: 'office', label: 'Office', scene: 'office' },
  { id: 'contact', label: 'Contact', scene: 'contact' },
];

// Travel is continuous and endless: wheel, swipe and arrow keys move a fractional position that is never clamped,
// so scrolling past the last station comes round to the first. The camera blends between neighbouring stations.
// When input pauses, the position settles on a station, leaning the way it was moving.
const WHEEL_STATION_PX = 520;
const SWIPE_SCREEN_FRACTION = 0.6;
const SETTLE_DELAY_MS = 180;
const SETTLE_LEAN = 0.35;
const WHEEL_LINE_PX = 40;
const README_KEY_PX = 90;
const README_PAGE_PX = 520;
const SCENES = VIEWS.map((item) => item.scene);
const wrapIndex = (index) => ((index % VIEWS.length) + VIEWS.length) % VIEWS.length;
const dominant = (a, b) => (Math.abs(a) >= Math.abs(b) ? a : b);

export default function PortfolioShell({ blocks }) {
  const [view, setView] = useState('home');
  const pointerRef = useRef({ x: 0, y: 0 });
  const progressRef = useRef(0);
  const scrollRef = useRef(0); // how far the README on the monitor is scrolled, in texture pixels
  // A close-up the visitor clicked (screen, laptop, keyboard); it holds until they press Esc or click away.
  // On the screen, the wheel, swipes and arrow keys scroll the README that is painted on the monitor.
  const focusRef = useRef(null);
  const setCloseUp = useCallback((key) => {
    if (key === 'screen') scrollRef.current = 0;
    focusRef.current = key;
  }, []);

  const goTo = useCallback((position) => {
    setCloseUp(null);
    progressRef.current = position;
    setView(VIEWS[wrapIndex(Math.round(position))].id);
  }, [setCloseUp]);

  // Take the shorter way round the loop to a station.
  const goToStation = useCallback((index) => {
    const base = Math.round(progressRef.current);
    let delta = wrapIndex(index - base);
    if (delta > VIEWS.length / 2) delta -= VIEWS.length;
    goTo(base + delta);
  }, [goTo]);

  // A clicked object: a station scene goes to that station, anything else is a close-up; null leaves the close-up.
  const focusOn = useCallback((key) => {
    const station = SCENES.indexOf(key);
    if (station >= 0) goToStation(station);
    else setCloseUp(key);
  }, [goToStation, setCloseUp]);

  useEffect(() => {
    const handlePointer = (event) => {
      pointerRef.current = { x: (event.clientX / window.innerWidth - 0.5) * 2, y: (0.5 - event.clientY / window.innerHeight) * 2 };
    };
    window.addEventListener('pointermove', handlePointer, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointer);
  }, []);

  // Wheel, touch drag and arrow keys in any direction all feed the same position.
  useEffect(() => {
    let timer;
    let lean = 0;
    let touch = null;
    const settle = () => {
      window.clearTimeout(timer);
      if (focusRef.current) return; // a close-up was chosen meanwhile: do not pull the camera away from it
      goTo(Math.round(progressRef.current + lean * SETTLE_LEAN));
      lean = 0;
    };
    const nudge = (amount) => {
      if (amount) lean = Math.sign(amount);
      goTo(progressRef.current + amount);
    };
    const onWheel = (event) => {
      if (event.ctrlKey) return;
      const unit = event.deltaMode === 1 ? WHEEL_LINE_PX : 1;
      if (focusRef.current === 'screen') {
        scrollRef.current += dominant(event.deltaY, event.deltaX) * unit;
        return;
      }
      nudge((dominant(event.deltaY, event.deltaX) * unit) / WHEEL_STATION_PX);
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, SETTLE_DELAY_MS);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        focusOn(null);
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return; // browser shortcuts such as Alt+Left are not ours
      if (focusRef.current === 'screen') {
        const step = { ArrowDown: README_KEY_PX, ArrowUp: -README_KEY_PX, PageDown: README_PAGE_PX, PageUp: -README_PAGE_PX }[event.key];
        if (step) scrollRef.current += step;
        if (event.key === 'Home') scrollRef.current = 0;
        if (event.key === 'End') scrollRef.current = Infinity;
        return;
      }
      const forward = ['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key);
      const backward = ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key);
      if (forward || backward) goTo(Math.round(progressRef.current) + (forward ? 1 : -1));
    };
    const onTouchStart = (event) => { touch = { x: event.touches[0].clientX, y: event.touches[0].clientY }; };
    const onTouchMove = (event) => {
      if (!touch) return;
      const { clientX, clientY } = event.touches[0];
      const delta = dominant(touch.y - clientY, touch.x - clientX);
      touch = { x: clientX, y: clientY };
      if (focusRef.current === 'screen') {
        scrollRef.current += delta;
        return;
      }
      nudge(delta / (window.innerHeight * SWIPE_SCREEN_FRACTION));
    };
    const onTouchEnd = () => {
      // A tap that never moved is a click on an object, not a scroll: leave any close-up alone.
      if (lean) settle();
      touch = null;
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [goTo, focusOn]);

  const current = VIEWS.find((item) => item.id === view) || VIEWS[0];

  return (
    <div className="portfolio-shell is-entered is-ready">
      <ExperienceCanvas chapter={current.scene} scenes={SCENES} progressRef={progressRef} focusRef={focusRef} scrollRef={scrollRef} blocks={blocks} pointerRef={pointerRef} onFocus={focusOn} />
      <header className="site-header">
        <button className="site-brand" type="button" onClick={() => goToStation(0)}><span className="brand-mark">+</span><span><b>DANH</b><small>CREATIVE DEVELOPER</small></span></button>
        <nav className="site-nav" aria-label="Camera stations">{VIEWS.map((item, index) => <button type="button" key={item.id} className={view === item.id ? 'active' : ''} onClick={() => goToStation(index)}><span>0{index + 1}</span>{item.label}</button>)}</nav>
        <div className="header-tools">
          <SiteClock />
        </div>
      </header>
    </div>
  );
}
