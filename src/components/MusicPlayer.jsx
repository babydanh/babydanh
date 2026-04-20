import { useState, useRef, useEffect } from 'react';

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef(null);

  // States cho màn hình Welcome
  const [entered, setEntered] = useState(false); // Xóa khỏi DOM chưa?
  const [fading, setFading] = useState(false);   // Đang hiệu ứng mờ dần?

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleEnterSite = () => {
    if (entered || fading) return; // Tránh click nhiều lần
    setFading(true); // Bắt đầu làm mờ màn hình

    // Phát nhạc ngay khi click
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }

    // Sau 800ms (trùng với thời gian CSS transition), xóa thẳng overlay để có thể click vào trang
    setTimeout(() => {
      setEntered(true);
    }, 800);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolume = (e) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  return (
    <>
      {/* MÀN HÌNH WELCOME OVERLAY*/}
      {!entered && (
        <div 
          className={`welcome-overlay ${fading ? 'fade-out' : ''}`} 
          onClick={handleEnterSite}
        >
          <div className="welcome-content">
            <div className="pulse-circle"></div>
            <h2 className="welcome-text">Nhấp bất kỳ đâu để vào Trang</h2>
            <p className="welcome-subtext"></p>
          </div>
        </div>
      )}

      {/* ── TRÌNH PHÁT NHẠC ── */}
      <div className="music-player">
        <audio ref={audioRef} src="/music.mp3" loop />
        
        <button className="music-toggle" onClick={togglePlay} title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}>
          <span className="music-icon">{isPlaying ? '🎵' : '🔇'}</span>
          <span className="music-label">{isPlaying ? 'Playing' : 'Music'}</span>
          {isPlaying && (
            <span className="music-bars">
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </span>
          )}
        </button>

        <input 
          type="range" 
          className="volume-slider" 
          min="0" max="1" step="0.01" 
          value={volume} 
          onChange={handleVolume}
          title="Chỉnh âm lượng"
        />
      </div>
    </>
  );
}
