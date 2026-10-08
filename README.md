# SentinelDRP

Find look-alike websites, fake social accounts and copycat apps for **any brand**.

## How the pieces connect

```
 Browser  ──►  client  (React + Vite, :5173)
                 │  /api  (Vite proxy)
                 ▼
              server  (Node + Express + MongoDB, :8000)
                 │            │
                 │            └──►  Gemini  (optional: explanations, takedown drafts, Copilot, brand auto-fill)
                 ▼
         detection-service  (Python + FastAPI, :8001)
            ├─ app_detection     Google Play scanner (name, developer, description, keywords)
            └─ social_detection  social account checker (name, keywords, homoglyphs)
```

- **client** is the UI. It only ever talks to `/api`.
- **server** is the single gateway. It resolves any brand by name, generates look-alike candidates,
  calls the Python service for real scans, saves results to MongoDB and calls Gemini.
- **detection-service** holds your two Python detectors behind HTTP.

## Folder layout

```
sentinel-drp/
├── client/               React UI
├── server/               Node API (your original backend, extended)
│   ├── config/  models/  controllers/  routes/
│   ├── middleware/       rate limit, fail-fast when the database is down
│   └── services/         brandEngine, brandStore, scanService, pythonClient, geminiService
└── detection-service/    Python detectors + FastAPI wrapper (main.py)
```

## Run it

Requirements: Node 18+, Python 3.10+, MongoDB running locally (optional but needed to save scans).

```bash
npm run setup          # installs everything
cp server/.env.example server/.env     # then add GEMINI_API_KEY if you want AI
npm run dev            # starts server, client and detection service together
```

Open http://localhost:5173. The header shows whether the database, detection service and AI are on.
Each part degrades on its own: without MongoDB scans are not saved, without the Python service social
accounts fall back to the built-in checker, without a Gemini key the AI buttons are disabled.

On macOS or Linux, if `python` is not found, change `python` to `python3` in the root `package.json` scripts.

## API

| Route | What it does |
|---|---|
| `POST /api/brands/resolve` | Create or load a profile for any brand name (AI fills in identifiers if enabled) |
| `GET/PATCH /api/brands/:key` | Read or correct a brand's official identifiers |
| `GET /api/threats/:key` | Threat queue: generated look-alikes plus saved scan findings |
| `POST /api/scan/run` | Live scan: `{ brandKey, type: "apps" \| "social" \| "all", accounts? }` |
| `POST /api/check-name` | How closely a name imitates the brand |
| `POST /api/ai/analyze-threat`, `/takedown-draft`, `/chat/stream` | Gemini features |
| `/api/brand`, `/api/dashboard`, `/api/scan/*`, `/api/threat` | Your original routes (unchanged; dashboard and threat accept `?brand=`) |

## Things to know

- Generated look-alikes are **name patterns**, not confirmed live sites or accounts. The UI says so.
- App scan results are only as good as the official developer name. Set it in "Edit official identifiers".
- Social scanning does not scrape any platform. It scores usernames you provide plus common impersonation names.
- AI-suggested identifiers can be wrong. The UI asks the user to review them.

## Next.js frontend (`frontend/`)

A second UI built with Next.js lives in `frontend/`. It is connected to the same Node server:

- `frontend/next.config.mjs` forwards every `/api/*` request to the server (default `http://localhost:8000`,
  override with `API_TARGET`). `/api/social-scan` maps to `/api/scan/social` and `/api/app-scan` to `/api/scan/apps`.
- Setup: `npm run setup && npm run setup:frontend`
- Run server, frontend and detection service together: `npm run dev:web`, then open http://localhost:3000.
- The frontend now uses the backend for real: the Brand Profile form saves every field (`/api/brand`, with a fallback to
  `/api/brands/resolve` + `PATCH` when MongoDB is off), the scan buttons call `POST /api/scan/run`, the dashboard reads
  `/api/dashboard` and `/api/threat`, and threat details open scan results. If the backend or database is unreachable,
  pages keep showing their sample data and the scan buttons show an error message.
