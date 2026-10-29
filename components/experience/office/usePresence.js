'use client';

import { useEffect, useRef } from 'react';
import { sanitizePresence } from './presence.js';

const POLL_MS = 5000;
const TIMEOUT_MS = 4000;
const MAX_BODY_CHARS = 16_384;

// Polls the relay and keeps the newest sanitized snapshot in a ref (read per frame, so no re-render). Without a URL it does nothing.
// A failed poll keeps the old snapshot; `isFresh` retires it once it is stale.
export function usePresence(url) {
  const ref = useRef(null);
  useEffect(() => {
    if (!url) return undefined;
    let stopped = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) return;
        const body = await res.text();
        if (body.length > MAX_BODY_CHARS) return; // a real snapshot is a couple of KB
        const next = sanitizePresence(JSON.parse(body));
        if (!stopped) ref.current = next;
      } catch {
        // offline or relay down: keep the last snapshot
      }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [url]);
  return ref;
}
