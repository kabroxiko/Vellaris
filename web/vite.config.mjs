import { defineConfig, loadEnv } from 'vite'

// Dev-time HMR settings can be provided via environment variables when
// running behind a reverse proxy (e.g. Nginx Proxy Manager):
// - VITE_HMR_HOST: external hostname (maps.example.com)
// - VITE_HMR_PORT: external port for websocket (usually 443 for wss)
// - VITE_HMR_PROTOCOL: 'wss' or 'ws'

export default defineConfig(({ mode, command }) => {
  // Load .env files for the current mode and prefer those values; fall back
  // to shell-exported `process.env` when a value is not present in the .env.
  const env = loadEnv(mode, process.cwd())
  const hmrHost = env.VITE_HMR_HOST || process.env.VITE_HMR_HOST
  const rawHmrPort = env.VITE_HMR_PORT || process.env.VITE_HMR_PORT
  const hmrPort = rawHmrPort ? Number(rawHmrPort) : undefined
  const hmrProtocol = env.VITE_HMR_PROTOCOL || process.env.VITE_HMR_PROTOCOL || undefined
  // Allowed hosts: always include localhost and the HMR host if present
  let allowedHosts = ['localhost']
  const hmrHostTrimmed = hmrHost && String(hmrHost).trim()
  if (hmrHostTrimmed) allowedHosts.push(hmrHostTrimmed)
  // remove duplicates and falsy values
  allowedHosts = allowedHosts.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

  // Computed hosts and HMR settings (no debug output)

  return {
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
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['lcov', 'text'],
        reportsDirectory: 'coverage',
        exclude: ['src/main.jsx']
      }
    }
  }
})
