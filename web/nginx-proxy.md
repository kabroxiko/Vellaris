# Deploying the frontend + API behind Nginx Proxy Manager

This document shows a minimal setup so the React frontend and the Vellaris API work behind Nginx Proxy Manager (NPM).

Goal

- Serve the frontend at `https://maps.example.com/` (static files or a proxy to a Node server)
- Proxy API requests under `https://maps.example.com/api/*` to the Vellaris API running on the host (default `http://127.0.0.1:8080`)

Frontend: build and serve static files

1. Build the app for production

```bash
cd web
npm install
npm run build
# dist/ will contain the static site
```

2. In Nginx Proxy Manager, create a new `Proxy Host`:

- Domain Names: `maps.example.com`
- Scheme: `http`
- Forward Hostname / IP: the host serving the static files (usually the same machine or a container)
- Forward Port: the port where your static file server listens (for example, `5173` for `vite preview`, or `80`/`8080` if you serve `dist/` via nginx)

API proxy setup (recommended)

Use Nginx Proxy Manager to forward `/api` to the Vellaris API (port 8080). In NPM you can set a custom location configuration. Example Nginx location block to add to the proxy host's `Advanced` > `Custom Nginx Configuration`:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:8080/; # Note the trailing slash
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_redirect off;
}

# Optionally forward /api (no trailing slash) as well
location = /api {
  return 307 $scheme://$host/api/;
}
```

Notes

- The frontend uses a relative API base (`/api`) by default, so requests go to `https://maps.example.com/api/generate`.
- The Vellaris API sets CORS headers (`Access-Control-Allow-Origin: *`) by default; when serving frontend and API under the same origin you should not need CORS. If you prefer restricting CORS, edit `MapApiServer`.
- Ensure the proxy preserves `Host` and `X-Forwarded-*` headers (the `proxy_set_header` lines above do that).
- If you prefer NPM's UI instead of custom config, create a second Proxy Host in NPM with `Domain` set to the same domain and `Location` `/api` forwarding to `127.0.0.1:8080` — NPM allows path forwarding in some versions.

Troubleshooting

- If you get 4xx/5xx responses from the API, check the API logs (run the server and watch console output).
- If you see mixed-content or redirect issues, ensure `X-Forwarded-Proto` is set and NPM is configured with SSL correctly.

Dev mode (Vite) behind Nginx Proxy Manager

To run `vite` (`npm run dev`) behind Nginx and still have Hot Module Reloading (HMR) work, you must:

- Proxy the site root to the Vite dev server (default port `5173`).
- Proxy websocket connections used by Vite HMR and preserve `Upgrade`/`Connection` headers.
- Configure Vite's HMR client to use the external host/port when accessed via the proxy (environment variables shown below).

Example `Custom Nginx Configuration` to add to the Proxy Host for `maps.example.com` (serves both app and API):

```nginx
# ensure websocket upgrade variable
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

location / {
  proxy_pass http://127.0.0.1:5173/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_cache_bypass $http_upgrade;
}

location /api/ {
  proxy_pass http://127.0.0.1:8080/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_redirect off;
}
```

How to start dev mode with HMR working through NPM

1. Start your Vellaris API (port 8080):

```bash
./gradlew run
```

2. Start Vite dev server with HMR configured for your external domain (replace `maps.example.com` with your host):

```bash
cd web
VITE_HMR_HOST=maps.example.com VITE_HMR_PORT=443 VITE_HMR_PROTOCOL=wss npm run dev
```

Vite will emit HMR websocket attempts to `wss://maps.example.com:443` which Nginx will proxy to the local `5173` dev server.

If you prefer to avoid setting env vars, the Vite config falls back to default (direct `ws` to dev server) which works when you access `http://localhost:5173` directly.
