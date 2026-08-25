'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ExperienceCanvas = dynamic(() => import('./experience/ExperienceCanvas'), {
  ssr: false,
  loading: () => null,
});

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

const PROJECTS = [
  {
    number: '01',
    title: 'RaoVat24H',
    type: 'Flutter ecosystem',
    description: 'A marketplace experience designed around fast discovery, clear flows, and a professional mobile-first interface.',
    stack: ['Flutter', 'Dart', 'Firebase'],
    accent: '#00e5ff',
  },
  {
    number: '02',
    title: 'Neon Archive',
    type: 'Interactive portfolio',
    description: 'A realtime visual identity system where motion, sound, and code become one navigable digital space.',
    stack: ['Next.js', 'Three.js', 'Web Audio'],
    accent: '#a78bfa',
  },
  {
    number: '03',
    title: 'EA Research Lab',
    type: 'Trading strategy studies',
    description: 'Exploring disciplined strategy design, data visualization, and automation concepts for MT4 and MT5.',
    stack: ['MQL', 'Python', 'Research'],
    accent: '#ff4d8d',
  },
];

const initialAudio = { bass: 0, mid: 0, treble: 0, energy: 0, beat: 0 };

export default function PortfolioShell() {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const lastBeatRef = useRef(0);
  const [theme, setTheme] = useState('dark');
  const [hasEntered, setHasEntered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState(initialAudio);
  const [scrollProgress, setScrollProgress] = useState(0);

  const audioSrc = useMemo(
    () => `${BASE_PATH}/${theme === 'dark' ? 'music.mp3' : 'music2.mp3'}`,
    [theme],
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('neon-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('neon-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;
    audio.pause();
    audio.load();
    audio.play().catch(() => setIsPlaying(false));
  }, [audioSrc, isPlaying]);

  useEffect(() => {
    const bins = new Uint8Array(128);
    let lastUiUpdate = 0;

    const tick = (time) => {
      const analyser = analyserRef.current;
      if (analyser && time - lastUiUpdate > 32) {
        analyser.getByteFrequencyData(bins);
        const average = (start, end) => {
          let total = 0;
          for (let i = start; i < end; i += 1) total += bins[i] || 0;
          return total / ((end - start) * 255);
        };
        const bass = average(1, 8);
        const mid = average(8, 34);
        const treble = average(34, 82);
        const energy = bass * 0.5 + mid * 0.3 + treble * 0.2;
        const beat = bass > 0.62 && time - lastBeatRef.current > 240 ? 1 : 0;
        if (beat) lastBeatRef.current = time;
        setAudioData({ bass, mid, treble, energy, beat });
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
        const context = new AudioContextClass();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
        audioContextRef.current = context;
        analyserRef.current = analyser;
        sourceRef.current = source;
      }
      await audioContextRef.current.resume();
      await audio.play();
      setIsPlaying(true);
    } catch {
    }
  };

  const handleEnter = async () => {
    setHasEntered(true);
    await activateAudio();
  };

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await activateAudio();
    }
  };

  const toggleTheme = () => setTheme((value) => (value === 'dark' ? 'light' : 'dark'));

  return (
    <div className={`site-shell theme-${theme} ${hasEntered ? 'is-entered' : ''}`}>
      <ExperienceCanvas audioData={audioData} theme={theme} scrollProgress={scrollProgress} />
      <audio ref={audioRef} src={audioSrc} loop preload="metadata" />

      {!hasEntered && (
        <section className="intro-overlay" aria-label="Portfolio introduction">
          <div className="intro-grid" />
          <div className="intro-scanline" />
          <div className="intro-core" aria-hidden="true">
            <span className="intro-core-ring ring-one" />
            <span className="intro-core-ring ring-two" />
            <span className="intro-core-dot" />
          </div>
          <div className="intro-copy">
            <p className="eyebrow">Digital portfolio / 2026</p>
            <h1>Nguyễn Minh <span>Danh</span></h1>
            <p className="intro-description">A developer building useful products with code, motion, and curiosity.</p>
            <button className="enter-button" onClick={handleEnter} type="button">
              <span>Enter the archive</span>
              <span className="button-arrow">↗</span>
            </button>
            <p className="intro-hint">Click to start the experience &amp; audio</p>
          </div>
          <div className="intro-meta intro-meta-left">HUFLIT / IT STUDENT</div>
          <div className="intro-meta intro-meta-right">10°N 106°E / VIETNAM</div>
        </section>
      )}

      <header className="site-header">
        <a className="brand-mark" href="#top" aria-label="Back to top">
          <span className="brand-symbol">N</span>
          <span>NEON ARCHIVE <small>/ DANH</small></span>
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#about">01 / About</a>
          <a href="#work">02 / Work</a>
          <a href="#contact">03 / Contact</a>
        </nav>
        <div className="header-tools">
          <button className="tool-button" type="button" onClick={toggleAudio} aria-label={isPlaying ? 'Pause music' : 'Play music'}>
            <span className={`sound-bars ${isPlaying ? 'is-playing' : ''}`}><i /><i /><i /><i /></span>
            {isPlaying ? 'Sound on' : 'Sound off'}
          </button>
          <button className="tool-button theme-button" type="button" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☼' : '◐'}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section section-frame">
          <div className="hero-kicker"><span className="status-dot" /> Available for thoughtful digital work</div>
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="eyebrow">01 / Identity system</p>
              <h2>Ideas become <em>alive</em> when they move.</h2>
              <p className="hero-lede">I&apos;m Danh — an IT student and developer from Vietnam, crafting backend systems, mobile products, and digital experiences with a pulse.</p>
              <div className="hero-actions">
                <a className="primary-link" href="#work">Explore the work <span>↘</span></a>
                <a className="text-link" href="mailto:Macter.970@gmail.com">Macter.970@gmail.com</a>
              </div>
            </div>
            <div className="hero-side-note"><span>Scroll to navigate</span><span className="vertical-line" /><span>Realtime experience</span></div>
          </div>
          <div className="hero-bottomline"><span>Nguyễn Minh Danh</span><span>Developer / Creator / Learner</span><span>Scroll 001 — 006</span></div>
        </section>

        <section id="about" className="about-section section-frame content-section">
          <div className="section-index">01 <span>About the operator</span></div>
          <div className="about-grid">
            <div>
              <p className="eyebrow">A human behind the interface</p>
              <h3>Curious by default.<br /><span>Precise by practice.</span></h3>
            </div>
            <div className="about-copy">
              <p>I&apos;m currently studying IT at HUFLIT while building products that sit between engineering and visual communication. My favorite work happens when a solid system also feels unmistakably human.</p>
              <div className="fact-grid">
                <div><strong>03+</strong><span>Years learning code</span></div>
                <div><strong>04</strong><span>Core disciplines</span></div>
                <div><strong>∞</strong><span>Things left to explore</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="work" className="work-section section-frame content-section">
          <div className="section-index">02 <span>Selected transmissions</span></div>
          <div className="work-heading"><h3>Things I&apos;m <span>building</span></h3><p>Projects, experiments, and systems in progress.</p></div>
          <div className="project-list">
            {PROJECTS.map((project) => (
              <article className="project-row" key={project.number} style={{ '--project-accent': project.accent }}>
                <div className="project-number">{project.number}</div>
                <div className="project-main"><p className="project-type">{project.type}</p><h4>{project.title}</h4><p className="project-description">{project.description}</p></div>
                <div className="project-stack">{project.stack.map((item) => <span key={item}>{item}</span>)}</div>
                <a className="project-link" href="https://github.com/babydanh" target="_blank" rel="noreferrer" aria-label={`View ${project.title} on GitHub`}>↗</a>
              </article>
            ))}
          </div>
        </section>

        <section className="skills-section section-frame content-section">
          <div className="section-index">03 <span>Technical constellation</span></div>
          <div className="skills-layout">
            <div><p className="eyebrow">Current toolkit</p><h3>A stack with<br /><span>room to grow.</span></h3></div>
            <div className="skill-cloud"><span>Dart</span><span>Flutter</span><span>C#</span><span>HTML / CSS</span><span>Firebase</span><span>Git</span><span>Figma</span><span>Python</span><span>Three.js</span><span>Curiosity</span></div>
          </div>
        </section>

        <section id="contact" className="contact-section section-frame content-section">
          <div className="contact-orbit" aria-hidden="true"><span /><span /><span /></div>
          <div className="section-index">04 <span>Open channel</span></div>
          <div className="contact-content"><p className="eyebrow">Let&apos;s make something with a pulse</p><h3>Have a signal?<br /><span>Send it my way.</span></h3><a className="contact-email" href="mailto:Macter.970@gmail.com">Macter.970@gmail.com <span>↗</span></a></div>
          <div className="contact-links"><a href="https://github.com/babydanh" target="_blank" rel="noreferrer">GitHub</a><a href="https://www.facebook.com/danh.nguyenminh.777" target="_blank" rel="noreferrer">Facebook</a><a href="https://www.instagram.com/danh.nguyenminh.777/" target="_blank" rel="noreferrer">Instagram</a></div>
        </section>
      </main>

      <footer className="site-footer"><span>© 2026 Nguyễn Minh Danh</span><span>Built with curiosity, code &amp; realtime motion</span><span>Vietnam / VN</span></footer>
    </div>
  );
}
