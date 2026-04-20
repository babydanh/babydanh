import avatar from '../assets/avatar.jpg';

/* ──────── 7 Undertale soul hearts ──────── */
const SOUL_COLORS = [
  '#ff0000', // Determination (Red)
  '#ff8000', // Bravery      (Orange)
  '#ffff00', // Justice      (Yellow)
  '#00ff00', // Kindness     (Green)
  '#00ffff', // Patience     (Cyan)
  '#0080ff', // Integrity    (Blue)
  '#b400ff', // Perseverance (Purple)
];

function HeartSVG({ color, style }) {
  return (
    <svg
      className="undertale-heart"
      style={style}
      viewBox="0 0 32 32"
      width="22"
      height="22"
      fill={color}
    >
      {/* Classic Undertale pixel-heart shape via path */}
      <path d="M16 28 L4 16 C0 12 0 6 5 4 C10 2 14 6 16 10 C18 6 22 2 27 4 C32 6 32 12 28 16 Z" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="hero" id="hero">
      {/* 7 Undertale hearts floating around */}
      <div className="hearts-container" aria-hidden="true">
        {SOUL_COLORS.map((color, i) => (
          <HeartSVG
            key={i}
            color={color}
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        ))}
      </div>

      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            I'm <span className="highlight">Danh</span>
          </h1>
          <p className="hero-subtitle">IT Student @ HUFLIT | Backend Developer & Mobile Enthusiast</p>

          {/* Social icons */}
          <div className="social-row">
            <a href="https://www.facebook.com/danh.nguyenminh.777" target="_blank" rel="noopener noreferrer" className="social-icon" title="Facebook">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3l-.5 3H13v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
            </a>
            <a href="https://github.com/babydanh" target="_blank" rel="noopener noreferrer" className="social-icon" title="GitHub">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
            </a>
            <a href="https://www.instagram.com/danh.nguyenminh.777/" target="_blank" rel="noopener noreferrer" className="social-icon" title="Instagram">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z"/></svg>
            </a>
          </div>
        </div>

        <div className="hero-avatar">
          <div className="avatar-glow"></div>
          <img src={avatar} alt="Nguyễn Minh Danh" className="avatar-img" />
        </div>
      </div>
    </section>
  );
}
