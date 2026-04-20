import { useEffect, useRef } from 'react';

/* ──────────────────────────────────────────────
   PROJECT DATA — Add your projects here later!
   Each object: { title, icon, desc, color, viewUrl, repoUrl }
   ────────────────────────────────────────────── */
const PROJECTS = [];

function ProjectCard({ project, index }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${index * 0.12}s`;
          el.classList.add('card-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div className="project-card card-hidden" ref={ref}>
      <div className="card-preview" style={{ background: project.color }}>
        <span className="card-preview-icon">{project.icon}</span>
      </div>
      <div className="card-body">
        <h3 className="card-title">
          {project.icon} {project.title}
        </h3>
        <p className="card-desc">{project.desc}</p>
        <div className="card-actions">
          <a href={project.viewUrl} className="btn btn-outline" target="_blank" rel="noopener noreferrer">
            View Project
          </a>
          <a href={project.repoUrl} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{marginRight: 6}}><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
            Repository
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  return (
    <section className="projects" id="projects">
      <h2 className="section-title">Coding</h2>

      {PROJECTS.length === 0 ? (
        <p className="empty-projects">Các dự án sẽ sớm được cập nhật... ✨</p>
      ) : (
        <div className="projects-grid">
          {PROJECTS.map((project, i) => (
            <ProjectCard key={i} project={project} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
