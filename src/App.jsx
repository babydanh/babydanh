import './App.css';
import ParticlesBackground from './components/ParticlesBackground';
import MusicPlayer from './components/MusicPlayer';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <ParticlesBackground />
      <MusicPlayer />

      {/* Header bar */}
      <header className="header">
        <span className="header-name">Nguyễn Minh Danh</span>
        <a href="mailto:Macter.970@gmail.com" className="header-email">Macter.970@gmail.com</a>
      </header>

      <main className="content-wrapper">
        <Hero />
        <Projects />
      </main>

      <Footer />
    </>
  );
}

export default App;