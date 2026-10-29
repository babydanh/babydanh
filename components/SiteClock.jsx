'use client';

import { useEffect, useState } from 'react';

const TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const pad = (value) => String(value).padStart(2, '0');
const elapsed = (seconds) => `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;

// Header badge: the time in Vietnam and how long the visitor has been on the site. Rendered after mount so the server and client agree.
export default function SiteClock() {
  const [clock, setClock] = useState(null);
  useEffect(() => {
    const start = Date.now();
    const tick = () => setClock({ now: TIME.format(new Date()), online: elapsed(Math.floor((Date.now() - start) / 1000)) });
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="site-clock" role="timer">
      <span className="clock-dot" aria-hidden="true" />
      <b>{clock?.now ?? '--:--:--'}</b>
      <small>GMT+7 · online {clock?.online ?? '00:00:00'}</small>
    </div>
  );
}
