import { defineConfig } from 'vite'

// Dev-time HMR settings can be provided via environment variables when
// running behind a reverse proxy (e.g. Nginx Proxy Manager):
// - VITE_HMR_HOST: external hostname (maps.example.com)
// - VITE_HMR_PORT: external port for websocket (usually 443 for wss)
// - VITE_HMR_PROTOCOL: 'wss' or 'ws'
const hmrHost = process.env.VITE_HMR_HOST
const hmrPort = process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : undefined
const hmrProtocol = process.env.VITE_HMR_PROTOCOL || undefined
// - VITE_ALLOWED_HOSTS: comma-separated hostnames allowed by Vite dev server
const allowedHostsEnv = process.env.VITE_ALLOWED_HOSTS || ''
const allowedHosts = allowedHostsEnv
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  // always allow localhost for convenience
  .concat(['localhost'])
  // remove duplicates
  .filter((v, i, a) => a.indexOf(v) === i)

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts,
    // If VITE_HMR_HOST is set, configure HMR client to use the proxied host
    // IMPORTANT: do NOT bind the dev server to the external hostname (which may
    // resolve to a remote IP like Cloudflare). Bind to all interfaces and only
    // instruct the HMR *client* to connect to the external host/port using
    // `clientHost`/`clientPort` to avoid EADDRNOTAVAIL errors.
    hmr: hmrHost
      ? {
          protocol: hmrProtocol || 'wss',
          clientHost: hmrHost,
          clientPort: hmrPort,
        }
      : undefined,
  },
})
