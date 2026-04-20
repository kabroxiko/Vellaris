# Vellaris Web UI

Minimal React + Vite frontend to POST map settings files to the Vellaris API `/generate` endpoint and display the returned image.

Quick start

```bash
cd web
npm install
npm run dev
# open http://localhost:5173 in your browser
```

Generate favicons from `vellaris.svg` (project root)

```bash
# requires ImageMagick (magick or convert)
cd web
npm run make-favicon
# outputs to web/public/
```

Configure API base URL by setting `VITE_API_BASE` in your environment, for example:

```bash
VITE_API_BASE="http://localhost:4567" npm run dev
```

Files of interest:

- [web/src/GenerateForm.jsx](web/src/GenerateForm.jsx#L1)
- [web/src/App.jsx](web/src/App.jsx#L1)
