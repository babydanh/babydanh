// Run: PRESENCE_TOKEN=<24+ chars> PRESENCE_ALLOW_ORIGIN=https://babydanh.github.io node relay/server.mjs
// Binds to loopback by default; put it behind your own TLS proxy or tunnel. Never publish the token.
import { createRelayServer } from './relay.mjs';

const host = process.env.PRESENCE_HOST ?? '127.0.0.1';
const port = Number(process.env.PRESENCE_PORT ?? 8787);
const server = createRelayServer({ token: process.env.PRESENCE_TOKEN, allowOrigin: process.env.PRESENCE_ALLOW_ORIGIN });

server.listen(port, host, () => console.log(`[presence-relay] listening on http://${host}:${port}/presence`));
