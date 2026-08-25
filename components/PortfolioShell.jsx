'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ExperienceCanvas = dynamic(() => import('./experience/ExperienceCanvas'), { ssr: false });
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

const CHAPTERS = [
  { id: 'boot', code: '00', label: 'Boot sequence' },
  { id: 'hub', code: '01', label: 'Operator hub' },
  { id: 'map', code: '02', label: 'Quest map' },
  { id: 'loadout', code: '03', label: 'Skill loadout' },
  { id: 'contact', code: '04', label: 'Final signal' },
];

const PROJECTS = [
  { title: 'RaoVat24H', type: 'Mobile marketplace', status: 'In development', color: '#00e5ff', code: 'RV-24', description: 'A mobile marketplace concept focused on fast discovery, clean flows, and a useful buying experience.', role: 'Product / Mobile development', stack: ['Flutter', 'Dart', 'Firebase'], signal: 'A practical product with a human pace.' },
  { title: 'Neon Archive', type: 'Realtime portfolio', status: 'Active signal', color: '#a78bfa', code: 'NA-26', description: 'This interactive portfolio system: a realtime world where code, motion, sound, and identity meet.', role: 'Creative development / Frontend', stack: ['Next.js', 'Three.js', 'Web Audio'], signal: 'A portfolio that behaves like a world.' },
  { title: 'EA Research Lab', type: 'Strategy research', status: 'Exploring', color: '#ff4d8d', code: 'EA-MT', description: 'Researching disciplined strategy design and automation concepts for MT4 and MT5.', role: 'Research / Systems thinking', stack: ['MQL', 'Python', 'MT4 / MT5'], signal: 'Turning curiosity into structured experiments.' },
];

const SKILLS = [
  { label: 'Dart', group: 'BUILD', level: 'Core language' }, { label: 'Flutter', group: 'BUILD', level: 'Mobile systems' }, { label: 'Next.js', group: 'WEB', level: 'Current frontier' }, { label: 'Three.js', group: 'WEB', level: 'Realtime worlds' }, { label: 'C#', group: 'BUILD', level: 'Systems thinking' }, { label: 'Firebase', group: 'DATA', level: 'Product foundation' }, { label: 'Python', group: 'DATA', level: 'Research tools' }, { label: 'MQL', group: 'DATA', level: 'MT4 / MT5' }, { label: 'Figma', group: 'TOOLS', level: 'Visual planning' }, { label: 'Git', group: 'TOOLS', level: 'Ship safely' },
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
  const [chapter, setChapter] = useState('boot');
  const [hasEntered, setHasEntered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [hoveredProject, setHoveredProject] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.82);
  const [audioData, setAudioData] = useState(INITIAL_AUDIO);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const currentIndex = CHAPTERS.findIndex((item) => item.id === chapter);
  const currentChapter = CHAPTERS[currentIndex] || CHAPTERS[0];
  const project = activeProject === null ? null : PROJECTS[activeProject];

  const navigateTo = useCallback((nextId) => {
    if (!nextId || nextId === chapter || isTransitioning) return;
    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setChapter(nextId);
      setActiveProject(null);
      setHoveredProject(null);
      setIsTransitioning(false);
    }, 520);
  }, [chapter, isTransitioning]);

  const navigateBy = useCallback((direction) => {
    if (!hasEntered) return;
    const nextIndex = Math.max(1, Math.min(CHAPTERS.length - 1, currentIndex + direction));
    navigateTo(CHAPTERS[nextIndex].id);
  }, [currentIndex, hasEntered, navigateTo]);

  useEffect(() => () => window.clearTimeout(transitionTimerRef.current), []);

  useEffect(() => {
    const handlePointer = (event) => setPointer({ x: (event.clientX / window.innerWidth) * 2 - 1, y: -(event.clientY / window.innerHeight) * 2 + 1 });
    const handleKey = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); navigateBy(1); }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); navigateBy(-1); }
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
    const frequency = new Uint8Array(128);
    let lastUiUpdate = 0;
    const tick = (time) => {
      if (analyserRef.current && time - lastUiUpdate > 32) {
        analyserRef.current.getByteFrequencyData(frequency);
        const average = (from, to) => frequency.slice(from, to).reduce((sum, value) => sum + value, 0) / ((to - from) * 255);
        const bass = average(1, 8); const mid = average(8, 34); const treble = average(34, 82); const energy = bass * 0.5 + mid * 0.3 + treble * 0.2;
        const beatPulse = bass > 0.61 && time - lastBeatRef.current > 240 ? 1 : 0;
        if (beatPulse) lastBeatRef.current = time;
        setAudioData({ bass, mid, treble, energy, beatPulse });
        lastUiUpdate = time;
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
        analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.82; gain.gain.value = 1.45;
        const source = context.createMediaElementSource(audio); source.connect(gain); gain.connect(analyser); analyser.connect(context.destination);
        audioContextRef.current = context; analyserRef.current = analyser; gainRef.current = gain;
      }
      await audioContextRef.current.resume(); await audio.play(); setIsPlaying(true);
    } catch { /* Audio is optional; the scene remains playable without it. */ }
  };

  const toggleAudio = async () => {
    if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } else await activateAudio();
  };

  const handleVolume = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    if (gainRef.current) gainRef.current.gain.value = nextVolume * 1.75;
  };

  const enterExperience = async () => { setHasEntered(true); setChapter('hub'); await activateAudio(); };
  const selectProject = (index) => { setActiveProject(index); setHoveredProject(index); if (chapter !== 'map') navigateTo('map'); };
  const selectChapter = (id) => { if (id !== 'boot') { setHasEntered(true); navigateTo(id); } };
  const chapterClass = `chapter-${chapter}`;

  return (
    <div className={`game-shell ${chapterClass} ${hasEntered ? 'is-live' : 'is-booting'} ${isTransitioning ? 'is-transitioning' : ''}`}>
      <ExperienceCanvas chapter={chapter} audioData={audioData} pointer={pointer} activeProject={activeProject} onSelectProject={(item) => selectProject(item.index)} onHoverProject={(item) => setHoveredProject(item ? item.index : null)} />
      <audio ref={audioRef} src={`${BASE_PATH}/music.mp3`} loop preload="metadata" />
      <div className="screen-grain" aria-hidden="true" />
      <div className="transition-shutter" aria-hidden="true"><span /><span /><span /></div>

      <header className="game-header">
        <button className="game-brand" type="button" onClick={() => selectChapter('hub')}><span className="brand-cross">+</span><span>DANH <small>// SIGNAL RUNNER</small></span></button>
        <div className="header-readout"><span className="live-dot" /> {currentChapter.code} / {currentChapter.label}</div>
        <div className="header-controls"><button type="button" onClick={toggleAudio} className="hud-control"><span className={`mini-bars ${isPlaying ? 'playing' : ''}`}><i /><i /><i /></span>{isPlaying ? 'AUDIO LIVE' : 'AUDIO OFF'}</button><label className="volume-control"><span>VOL</span><input aria-label="Audio volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume} /></label><button type="button" onClick={() => selectChapter('contact')} className="hud-control">CONTACT ↗</button></div>
      </header>

      <aside className="chapter-rail" aria-label="Chapter navigation">
        <div className="rail-label">RUN / 2026</div>
        {CHAPTERS.slice(1).map((item) => <button type="button" key={item.id} className={`rail-node ${chapter === item.id ? 'active' : ''}`} onClick={() => selectChapter(item.id)}><span>{item.code}</span><b>{item.label}</b></button>)}
        <div className="rail-line"><span style={{ height: `${Math.max(4, (Math.max(0, currentIndex) / (CHAPTERS.length - 1)) * 100)}%` }} /></div>
      </aside>

      {!hasEntered && <section className="boot-screen"><div className="boot-crosshair"><span /><span /><i /></div><div className="boot-copy"><p className="system-kicker">SIGNAL RUNNER / PORTFOLIO OS</p><h1>Find the<br /><em>signal.</em></h1><p className="boot-description">An interactive field guide to Nguyễn Minh Danh — developer, builder, and lifelong learner.</p><button className="boot-button" type="button" onClick={enterExperience}><span className="boot-key">ENTER</span><span>Wake the system</span><strong>↗</strong></button><p className="boot-note">Audio will begin after connection / Use ↑ ↓ to navigate</p></div><div className="boot-status"><span>CONNECTION: STANDBY</span><span>WEBGL: READY</span><span>10°N / 106°E</span></div></section>}

      {hasEntered && <main className="game-main">
        {chapter === 'hub' && <section className="chapter-panel hub-panel"><div className="panel-tag">01 / OPERATOR HUB</div><div className="hub-content"><div className="operator-copy"><p className="system-kicker">IDENTITY SIGNAL DETECTED</p><h1>Nguyễn Minh<br /><em>Danh</em></h1><p className="panel-lede">IT student at HUFLIT, developer of useful things, and a person who likes systems with a little soul.</p><div className="operator-meta"><span>ROLE<strong>Developer / Creator</strong></span><span>ORIGIN<strong>Vietnam / VN</strong></span><span>STATUS<strong className="cyan-text">Open to signals</strong></span></div><button className="text-action" type="button" onClick={() => navigateTo('map')}>Open the quest map <span>↘</span></button></div><div className="operator-card"><div className="card-corner" /><span className="card-code">OPERATOR / 001</span><img src={`${BASE_PATH}/avatar.jpg`} alt="Nguyễn Minh Danh" /><div className="card-footer"><span>CORE ONLINE</span><span>01—04</span></div></div></div><div className="chapter-bottom"><span>MOVE WITH ARROW KEYS / SCROLL</span><span>HUB SIGNAL STABLE</span></div></section>}

        {chapter === 'map' && <section className="chapter-panel map-panel"><div className="panel-tag">02 / QUEST MAP</div><div className="map-content"><div className="map-intro"><p className="system-kicker">SELECTED TRANSMISSIONS</p><h2>Choose a<br /><em>mission.</em></h2><p>Three signals from the current archive. Hover a node in the scene or select a dossier below.</p><div className="map-coordinates">LAT 10.8231 / LNG 106.6297<br />ARCHIVE DEPTH: 03 NODES</div></div><div className="mission-list">{PROJECTS.map((item, index) => <button type="button" key={item.title} className={`mission-row ${activeProject === index ? 'selected' : ''} ${hoveredProject === index ? 'hovered' : ''}`} onMouseEnter={() => setHoveredProject(index)} onMouseLeave={() => setHoveredProject(null)} onClick={() => setActiveProject(index)}><span className="mission-index" style={{ color: item.color }}>{item.code}</span><span className="mission-name"><small>{item.type}</small>{item.title}</span><span className="mission-status">{item.status}</span><span className="mission-arrow">↗</span></button>)}</div></div>{project && <div className="dossier"><div className="dossier-head"><span>DOSSIER / {project.code}</span><button type="button" onClick={() => setActiveProject(null)}>CLOSE ×</button></div><div className="dossier-body"><p className="system-kicker" style={{ color: project.color }}>{project.type}</p><h3>{project.title}</h3><p>{project.description}</p><div className="dossier-info"><span>ROLE<strong>{project.role}</strong></span><span>STACK<strong>{project.stack.join(' · ')}</strong></span></div><p className="dossier-signal">“{project.signal}”</p><a href="https://github.com/babydanh" target="_blank" rel="noreferrer" className="text-action">Open GitHub signal <span>↗</span></a></div></div>}<div className="chapter-bottom"><span>HOVER NODES / SELECT DOSSIER</span><span>MAP LINK: ACTIVE</span></div></section>}

        {chapter === 'loadout' && <section className="chapter-panel loadout-panel"><div className="panel-tag">03 / SKILL LOADOUT</div><div className="loadout-content"><div className="loadout-copy"><p className="system-kicker">CURRENT EQUIPMENT</p><h2>Build with<br /><em>curiosity.</em></h2><p>The tools change. The habit stays: learn, make, test, improve.</p></div><div className="skill-tree">{SKILLS.map((skill, index) => <div className={`skill-node skill-${index}`} key={skill.label}><span className="node-dot" /><span className="node-text"><b>{skill.label}</b><small>{skill.group} / {skill.level}</small></span></div>)}</div></div><div className="chapter-bottom"><span>LOADOUT / 10 ACTIVE SKILLS</span><span>SYNC RATE: {Math.round(72 + audioData.energy * 20)}%</span></div></section>}

        {chapter === 'contact' && <section className="chapter-panel contact-panel"><div className="panel-tag">04 / FINAL SIGNAL</div><div className="contact-content"><div className="contact-copy"><p className="system-kicker">CHANNEL OPEN</p><h2>Send a<br /><em>signal.</em></h2><p>Have an idea, a project, or a good reason to build something? The channel is open.</p><a className="contact-link" href="mailto:Macter.970@gmail.com">Macter.970@gmail.com <span>↗</span></a></div><div className="transmission-gate"><div className="gate-ring ring-a" /><div className="gate-ring ring-b" /><div className="gate-core">TX</div><span className="gate-label">READY TO TRANSMIT</span></div></div><div className="social-row"><a href="https://github.com/babydanh" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://www.facebook.com/danh.nguyenminh.777" target="_blank" rel="noreferrer">Facebook ↗</a><a href="https://www.instagram.com/danh.nguyenminh.777/" target="_blank" rel="noreferrer">Instagram ↗</a></div><div className="chapter-bottom"><span>END OF RUN / THANKS FOR EXPLORING</span><span>VN / 2026</span></div></section>}
      </main>}

      {hasEntered && <div className="nav-prompt"><button type="button" onClick={() => navigateBy(-1)} disabled={currentIndex <= 1}>↑</button><span>{currentChapter.code} / {String(CHAPTERS.length - 1).padStart(2, '0')}</span><button type="button" onClick={() => navigateBy(1)} disabled={currentIndex >= CHAPTERS.length - 1}>↓</button></div>}
      <footer className="game-footer"><span>© 2026 NGUYỄN MINH DANH</span><span>REALTIME / INTERACTIVE / HUMAN-MADE</span><span>SCROLL TO RUN</span></footer>
    </div>
  );
}
