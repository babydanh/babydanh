'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ExperienceCanvas = dynamic(() => import('./experience/ExperienceCanvas'), { ssr: false });
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

const VIEWS = [
  { id: 'home', label: 'Home', scene: 'hub' },
  { id: 'work', label: 'Selected work', scene: 'map' },
  { id: 'about', label: 'About', scene: 'loadout' },
  { id: 'contact', label: 'Contact', scene: 'contact' },
];

const PROJECTS = [
  { title: 'RaoVat24H', type: 'Mobile marketplace', status: 'In development', color: '#00e5ff', code: '01', description: 'A mobile marketplace concept focused on fast discovery, clean flows, and a useful buying experience.', role: 'Product / Mobile development', stack: ['Flutter', 'Dart', 'Firebase'], signal: 'A practical product with a human pace.' },
  { title: 'Neon Archive', type: 'Interactive portfolio', status: 'Active build', color: '#a78bfa', code: '02', description: 'This portfolio system: a realtime world where code, motion, sound, and identity meet without hiding the work.', role: 'Creative development / Frontend', stack: ['Next.js', 'Three.js', 'Web Audio'], signal: 'A portfolio should feel like a point of view.' },
  { title: 'EA Research Lab', type: 'Strategy research', status: 'Exploring', color: '#ff4d8d', code: '03', description: 'Researching disciplined strategy design and automation concepts for MT4 and MT5.', role: 'Research / Systems thinking', stack: ['MQL', 'Python', 'MT4 / MT5'], signal: 'Turning curiosity into structured experiments.' },
];

const SKILLS = [
  ['Dart', 'Core language'], ['Flutter', 'Mobile systems'], ['Next.js', 'Web architecture'], ['Three.js', 'Realtime worlds'], ['C#', 'Systems thinking'], ['Firebase', 'Product foundation'], ['Python', 'Research tools'], ['MQL', 'MT4 / MT5'], ['Figma', 'Visual planning'], ['Git', 'Ship safely'],
];

const INITIAL_AUDIO = { bass: 0, mid: 0, treble: 0, energy: 0, beatPulse: 0 };

export default function PortfolioShell() {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const gainRef = useRef(null);
  const rafRef = useRef(null);
  const lastBeatRef = useRef(0);
  const transitionTimerRef = useRef(null);
  const [view, setView] = useState('home');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasEntered, setHasEntered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('forward');
  const [transitionDestination, setTransitionDestination] = useState('');
  const [transitionScene, setTransitionScene] = useState('');
  const [activeProject, setActiveProject] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.82);
  const audioDataRef = useRef(INITIAL_AUDIO);
  const pointerRef = useRef({ x: 0, y: 0 });

  const viewIndex = Math.max(0, VIEWS.findIndex((item) => item.id === view));
  const currentView = VIEWS[viewIndex] || VIEWS[0];
  const project = activeProject === null ? null : PROJECTS[activeProject];

  useEffect(() => {
    let mounted = true;
    const startedAt = performance.now();
    const avatar = new Image();
    avatar.src = `${BASE_PATH}/avatar.jpg`;
    const audio = new Audio(`${BASE_PATH}/music.mp3`);
    audio.preload = 'metadata';
    const assetsReady = Promise.allSettled([
      avatar.decode ? avatar.decode().catch(() => undefined) : Promise.resolve(),
      new Promise((resolve) => { audio.addEventListener('loadedmetadata', resolve, { once: true }); audio.addEventListener('error', resolve, { once: true }); }),
      document.fonts?.ready || Promise.resolve(),
    ]);
    let frame;
    const tick = async (time) => {
      const elapsed = time - startedAt;
      if (mounted) setLoadProgress(Math.min(92, Math.round((elapsed / 1200) * 92)));
      await Promise.race([assetsReady, new Promise((resolve) => window.setTimeout(resolve, 1350))]);
      if (mounted && elapsed > 850) {
        setLoadProgress(100);
        window.setTimeout(() => mounted && setIsLoaded(true), 360);
        return;
      }
      if (mounted) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { mounted = false; cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => () => window.clearTimeout(transitionTimerRef.current), []);

  const navigateTo = useCallback((nextView) => {
    if (!nextView || nextView === view || isTransitioning) return;
    const nextIndex = VIEWS.findIndex((item) => item.id === nextView);
    const nextPage = VIEWS[nextIndex];
    const nextLabel = nextPage?.label || nextView;
    setTransitionDirection(nextIndex >= viewIndex ? 'forward' : 'backward');
    setTransitionDestination(nextLabel);
    setTransitionScene(nextPage?.scene || 'hub');
    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setView(nextView);
      setActiveProject(null);
      setIsTransitioning(false);
      setTransitionDestination('');
      setTransitionScene('');
    }, 620);
  }, [view, viewIndex, isTransitioning]);

  const navigateBy = useCallback((direction) => {
    if (!hasEntered) return;
    const nextIndex = Math.max(0, Math.min(VIEWS.length - 1, viewIndex + direction));
    navigateTo(VIEWS[nextIndex].id);
  }, [hasEntered, navigateTo, viewIndex]);

  useEffect(() => {
    const handlePointer = (event) => { pointerRef.current = { x: (event.clientX / window.innerWidth) * 2 - 1, y: -(event.clientY / window.innerHeight) * 2 + 1 }; };
    const handleKey = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); navigateBy(1); }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); navigateBy(-1); }
      if (event.key === 'Escape') setActiveProject(null);
    };
    const handleWheel = (event) => {
      if (!hasEntered || isTransitioning || Math.abs(event.deltaY) < 28) return;
      event.preventDefault();
      navigateBy(event.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener('pointermove', handlePointer, { passive: true });
    window.addEventListener('keydown', handleKey);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => { window.removeEventListener('pointermove', handlePointer); window.removeEventListener('keydown', handleKey); window.removeEventListener('wheel', handleWheel); };
  }, [navigateBy, hasEntered, isTransitioning]);

  useEffect(() => {
    const frequency = new Uint8Array(64);
    let lastAudioUpdate = 0;
    const average = (from, to) => {
      let total = 0;
      for (let index = from; index < to; index += 1) total += frequency[index] || 0;
      return total / ((to - from) * 255);
    };
    const tick = (time) => {
      if (analyserRef.current && time - lastAudioUpdate > 48) {
        analyserRef.current.getByteFrequencyData(frequency);
        const bass = average(1, 7); const mid = average(7, 20); const treble = average(20, 42); const energy = bass * 0.5 + mid * 0.3 + treble * 0.2;
        const beatPulse = bass > 0.61 && time - lastBeatRef.current > 280 ? 1 : 0;
        if (beatPulse) lastBeatRef.current = time;
        const previous = audioDataRef.current;
        audioDataRef.current = {
          bass: previous.bass * 0.72 + bass * 0.28,
          mid: previous.mid * 0.72 + mid * 0.28,
          treble: previous.treble * 0.72 + treble * 0.28,
          energy: previous.energy * 0.76 + energy * 0.24,
          beatPulse: beatPulse ? 1 : previous.beatPulse * 0.72,
        };
        lastAudioUpdate = time;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const activateAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass(); const analyser = context.createAnalyser(); const gain = context.createGain();
        analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.9; gain.gain.value = volume * 1.05;
        const source = context.createMediaElementSource(audio); source.connect(gain); gain.connect(analyser); analyser.connect(context.destination);
        audioContextRef.current = context; analyserRef.current = analyser; gainRef.current = gain;
      }
      await audioContextRef.current.resume(); await audio.play(); setIsPlaying(true);
    } catch { /* Audio is optional; the portfolio remains fully usable without it. */ }
  };

  const toggleAudio = async () => {
    if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } else await activateAudio();
  };

  const handleVolume = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    if (gainRef.current && audioContextRef.current) gainRef.current.gain.setTargetAtTime(nextVolume * 1.05, audioContextRef.current.currentTime, 0.015);
  };

  const enterExperience = async () => {
    if (!isLoaded || isTransitioning) return;
    setIsTransitioning(true);
    await activateAudio();
    transitionTimerRef.current = window.setTimeout(() => { setHasEntered(true); setView('home'); setIsTransitioning(false); }, 760);
  };

  const selectProject = (index) => setActiveProject(index);
  const selectView = (id) => { if (id !== 'home' || hasEntered) { setHasEntered(true); navigateTo(id); } };

  return (
    <div className={`portfolio-shell view-${view} ${hasEntered ? 'is-entered' : 'is-boot'} ${isLoaded ? 'is-ready' : 'is-loading'} ${isTransitioning ? 'is-transitioning' : ''} direction-${transitionDirection}`}>
      {!isLoaded && <section className="preloader" aria-label="Loading portfolio experience"><div className="preloader-top"><span>DANH / PORTFOLIO</span><span>LOADING EXPERIENCE</span></div><div className="preloader-orbit" aria-hidden="true"><i /><i /><i /></div><div className="preloader-copy"><p className="eyebrow">Next.js / Three.js / Web Audio</p><h1>Making the<br /><em>signal clear.</em></h1><div className="preloader-bar"><span style={{ width: `${loadProgress}%` }} /></div><div className="preloader-readout"><span>{String(loadProgress).padStart(3, '0')}%</span><span>{loadProgress < 100 ? 'PREPARING CONTENT' : 'READY TO ENTER'}</span></div></div><div className="preloader-bottom"><span>WEBGL READY</span><span>CONTENT FIRST</span><span>VN / 2026</span></div></section>}
      <ExperienceCanvas chapter={hasEntered ? (transitionScene || currentView.scene) : 'hub'} audioDataRef={audioDataRef} pointerRef={pointerRef} activeProject={activeProject} onSelectProject={(item) => selectProject(item.index)} onHoverProject={() => undefined} />
      <div className="canvas-scrim" aria-hidden="true" />
      <audio ref={audioRef} src={`${BASE_PATH}/music.mp3`} loop preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
      <div className="transition-layer" aria-hidden="true" />
      {isTransitioning && <div className="transition-status" aria-live="polite"><span>TRAVELING / {currentView.label.toUpperCase()}</span><i /><strong>{transitionDestination.toUpperCase()}</strong></div>}

      <header className="site-header">
        <button className="site-brand" type="button" onClick={() => selectView('home')}><span className="brand-mark">+</span><span><b>DANH</b><small>CREATIVE DEVELOPER</small></span></button>
        <nav className="site-nav" aria-label="Primary navigation">{VIEWS.map((item, index) => <button type="button" key={item.id} className={view === item.id ? 'active' : ''} onClick={() => selectView(item.id)}><span>0{index + 1}</span>{item.label}</button>)}</nav>
        <div className="header-tools"><button type="button" className="audio-toggle" onClick={toggleAudio} aria-label={isPlaying ? 'Pause music' : 'Play music'}><span className={`audio-bars ${isPlaying ? 'playing' : ''}`}><i /><i /><i /></span><span>{isPlaying ? 'Sound on' : 'Sound off'}</span></button><label className="volume-control"><span>VOL</span><input aria-label="Audio volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume} /></label></div>
      </header>

      {!hasEntered && <section className="boot-overlay"><div className="boot-copy"><p className="eyebrow">A portfolio in motion</p><h2>Build with<br /><em>curiosity.</em></h2><p className="boot-lede">I&apos;m Nguyễn Minh Danh — an IT student and developer making useful things with code, motion and a little soul.</p><button className="enter-button" type="button" onClick={enterExperience} disabled={!isLoaded}><span>{isLoaded ? 'ENTER' : 'WAIT'}</span><b>{isLoaded ? 'Explore the portfolio' : 'Preparing the experience'}</b><strong>↗</strong></button><p className="boot-hint">Click to enter / sound begins with your permission</p></div><div className="boot-footer"><span>INTERACTIVE PORTFOLIO</span><span>SCROLL OR USE ARROW KEYS</span></div></section>}

      {hasEntered && <main className="portfolio-main"><div className="page-stage" aria-live="polite" aria-label={`${currentView.label} page`}>
        {view === 'home' && <section className="page home-page" aria-labelledby="home-title"><div className="page-kicker"><span>01 / HOME</span><i /> <span>OPEN TO GOOD WORK</span></div><div className="home-grid"><div className="home-copy"><p className="eyebrow">Developer / Creator / HUFLIT</p><h1 id="home-title">Nguyễn Minh<br /><em>Danh.</em></h1><p className="lede">I design and build digital experiences where the interface feels as considered as the idea behind it.</p><div className="action-row"><button className="primary-action" type="button" onClick={() => navigateTo('work')}>View selected work <span>↗</span></button><button className="quiet-action" type="button" onClick={() => navigateTo('about')}>More about me <span>→</span></button></div><div className="home-facts"><span><b>01</b> Mobile systems</span><span><b>02</b> Realtime worlds</span><span><b>03</b> Curious by default</span></div></div><div className="home-visual"><div className="portrait-card"><span className="card-label">CURRENT SIGNAL / 001</span><img src={`${BASE_PATH}/avatar.jpg`} alt="Nguyễn Minh Danh" /><div className="portrait-footer"><span>AVAILABLE FOR BUILDING</span><span>VN</span></div></div><div className="visual-caption">A person behind<br /><em>the interface.</em></div></div></div></section>}

        {view === 'work' && <section className="page work-page" aria-labelledby="work-title"><div className="page-kicker"><span>02 / SELECTED WORK</span><i /><span>PROJECTS WITH A POINT OF VIEW</span></div><div className="section-heading"><div><p className="eyebrow">A small archive</p><h2 id="work-title">Things I&apos;m<br /><em>building.</em></h2></div><p className="section-note">A few experiments, products and systems from the current orbit. Select one to inspect the thinking behind it.</p></div><div className="project-grid">{PROJECTS.map((item, index) => <button type="button" className={`project-card project-${index + 1}`} key={item.title} onClick={() => selectProject(index)}><span className="project-number" style={{ color: item.color }}>0{item.code}</span><span className="project-type">{item.type}</span><strong>{item.title}</strong><p>{item.description}</p><span className="project-footer"><small>{item.status}</small><b>Open case ↗</b></span></button>)}</div></section>}

        {view === 'about' && <section className="page about-page" aria-labelledby="about-title"><div className="page-kicker"><span>03 / ABOUT</span><i /><span>THE PERSON BEHIND THE WORK</span></div><div className="about-grid"><div className="about-image"><img src={`${BASE_PATH}/avatar.jpg`} alt="Nguyễn Minh Danh" /><span className="image-stamp">DANH / 001</span></div><div className="about-copy"><p className="eyebrow">A builder in progress</p><h2 id="about-title">Learning by<br /><em>making.</em></h2><p className="lede">I&apos;m an IT student at HUFLIT who enjoys turning a blank screen into something useful, expressive and a little unexpected.</p><p className="body-copy">My current orbit moves between Flutter products, frontend systems, realtime 3D and strategy research. I care about clear interfaces, honest experiments and shipping the next version.</p><div className="skill-list">{SKILLS.map(([name, detail], index) => <button type="button" key={name} className={selectedSkill === index ? 'selected' : ''} onClick={() => setSelectedSkill(index)}><span>{name}</span><small>{detail}</small></button>)}</div><div className="skill-readout"><span>SELECTED SKILL</span><strong>{SKILLS[selectedSkill][0]}</strong><small>{SKILLS[selectedSkill][1]}</small></div></div></div></section>}

        {view === 'contact' && <section className="page contact-page" aria-labelledby="contact-title"><div className="page-kicker"><span>04 / CONTACT</span><i /><span>THE CHANNEL IS OPEN</span></div><div className="contact-grid"><div className="contact-copy"><p className="eyebrow">Have an idea?</p><h2 id="contact-title">Let&apos;s make<br /><em>something real.</em></h2><p className="lede">Good products start with a clear question. Send me a signal and let&apos;s see where it leads.</p><a className="email-link" href="mailto:Macter.970@gmail.com">Macter.970@gmail.com <span>↗</span></a></div><div className="contact-orbit"><div className="contact-ring ring-one" /><div className="contact-ring ring-two" /><div className="contact-core">HI</div><span>READY TO CONNECT</span></div></div><div className="social-links"><a href="https://github.com/babydanh" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://www.facebook.com/danh.nguyenminh.777" target="_blank" rel="noreferrer">Facebook ↗</a><a href="https://www.instagram.com/danh.nguyenminh.777/" target="_blank" rel="noreferrer">Instagram ↗</a></div></section>}
      </div></main>}

      {project && <div className="project-modal-backdrop" role="presentation" onClick={() => setActiveProject(null)}><article className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title" onClick={(event) => event.stopPropagation()}><div className="modal-head"><span>CASE STUDY / {project.code}</span><button type="button" onClick={() => setActiveProject(null)}>Close ×</button></div><div className="modal-body"><p className="eyebrow" style={{ color: project.color }}>{project.type}</p><h2 id="project-title">{project.title}</h2><p className="modal-description">{project.description}</p><div className="modal-meta"><span>ROLE<strong>{project.role}</strong></span><span>STACK<strong>{project.stack.join(' · ')}</strong></span><span>STATUS<strong>{project.status}</strong></span></div><blockquote>“{project.signal}”</blockquote><a className="primary-action" href="https://github.com/babydanh" target="_blank" rel="noreferrer">Open GitHub <span>↗</span></a></div></article></div>}

      <div className="page-progress"><span>0{viewIndex + 1}</span><i><b style={{ width: `${((viewIndex + 1) / VIEWS.length) * 100}%` }} /></i><span>0{VIEWS.length}</span></div><footer className="site-footer"><span>© 2026 NGUYỄN MINH DANH</span><span>DESIGNED IN MOTION / BUILT WITH INTENT</span></footer>
    </div>
  );
}
