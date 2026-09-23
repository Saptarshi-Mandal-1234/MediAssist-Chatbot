# MediAssist AI — Backend + Database

A complete, self-contained backend for the MediAssist AI medical advisor chatbot.
One Express server serves **both** the frontend UI and the API, backed by a real
SQLite database. No external database service, no native compilation, no Kaggle
account needed to get running.
https://mediassist-chatbot.onrender.com

## What's inside

```
mediassist-backend/
├── server.js              ← starts everything (UI + API) on one port
├── modePrompts.js          ← the 4 chatbot system prompts (kept server-side)
├── .env.example            ← copy to .env and add your API key
├── data/
│   └── symptom_dataset.csv ← disease ↔ symptom reference data (see note below)
├── db/
│   ├── database.js         ← SQLite setup, schema, CSV seeding
│   └── symptomMatcher.js   ← keyword matcher used to ground symptom answers
├── routes/
│   ├── chat.js              POST /api/chat            (proxies to Gemini)
│   ├── mood.js               GET/POST /api/mood
│   ├── medications.js        GET/POST/PATCH/DELETE /api/medications
│   ├── appointments.js       GET/POST/DELETE /api/appointments
│   ├── health.js             GET/POST /api/health-log, /api/vitals
│   └── symptoms.js           GET /api/diseases, /api/symptoms/search
└── public/
    └── index.html          ← your frontend, now wired to call /api/*
```

## Quick start

```bash
cd mediassist-backend
npm install
cp .env.example .env
# open .env and paste your real Gemini API key
npm start
```

Then open **http://localhost:3000** — that's it. Same server, same port, for both
the chat UI and the API.

> Requires **Node.js 22.5 or newer** (for the built-in `node:sqlite` module — see
> "Why no database install step" below). Check with `node --version`.

### Getting a Gemini API key (free)

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with a Google account
3. Click **Create API key**
4. Copy it into `.env` as `GEMINI_API_KEY=...`

Gemini has a generous free tier, so for personal/testing use you generally
won't need to add billing.

## Why no database install step

SQLite is used as the database, but instead of the usual `better-sqlite3` npm
package (which needs a C++ compiler to install), this project uses Node's
**built-in** `node:sqlite` module, shipped with Node 22.5+. That means:

- Zero native dependencies to compile
- The whole database is one file: `mediassist.db`, created automatically the
  first time you run `npm start`
- Delete that file any time to reset all data back to a clean slate

It's marked "experimental" by Node itself, which just means the API may change
in a future Node version — it's stable enough for this use case.

## How the chat flow works

1. The browser sends `{ mode, message, history }` to `POST /api/chat`
2. The server picks the right system prompt for that mode (symptom advisor,
   medication manager, mental health companion, or report analyzer)
3. **Symptom mode only:** the server runs your message against the seeded
   disease database (simple keyword overlap, no ML needed) and injects the top
   matches into the system prompt, so the model's answer is grounded in actual
   reference data instead of guessing from scratch
4. The server calls the Google Gemini API using your key (kept in `.env`, never
   sent to the browser) and returns the reply
5. Every message is logged to the `chat_messages` table for a basic history

## About the symptom-disease dataset

You originally asked for this to come from Kaggle. Two honest notes on that:

1. This sandbox's network access doesn't include `kaggle.com` (it's restricted
   to package registries like npm/PyPI), so I couldn't pull a live Kaggle
   dataset directly into this build.
2. In its place, `data/symptom_dataset.csv` is a **30-disease reference table I
   wrote in the same shape** as Kaggle's well-known "Disease Symptom
   Prediction" dataset (disease → symptoms → description → precautions →
   severity), covering common conditions (cold, flu, COVID-19, migraine, UTI,
   diabetes, depression, dengue, etc.) so the app works immediately out of the
   box.

**To swap in the real Kaggle dataset:** download it yourself from Kaggle (e.g.
search "Disease Symptom Prediction dataset"), reshape it to match the 5 columns
in `data/symptom_dataset.csv` (`disease,symptoms,description,precautions,severity`,
with multi-value fields as comma-separated text in quotes), replace the file,
delete `mediassist.db`, and restart the server — it will reseed automatically
from the new CSV.

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/chat` | Send a chat message, get an AI reply |
| GET | `/api/chat/history?mode=` | Full chat log (optionally filtered by mode) |
| GET/POST | `/api/mood` | Mood check-ins (1–10 scale) |
| GET/POST/PATCH/DELETE | `/api/medications` | Medication tracker |
| GET/POST/DELETE | `/api/appointments` | Appointment list |
| GET/POST | `/api/health-log` | Free-text health journal |
| GET/POST | `/api/vitals` | Blood pressure, heart rate, blood sugar, temperature |
| GET | `/api/diseases` | Browse the full seeded reference dataset |
| GET | `/api/symptoms/search?q=` | Keyword-match symptoms against the dataset |

All data is scoped to a single local user (no login system) — this is a
personal local-use tool, not a multi-tenant production app.

## What the frontend now does differently

The HTML file you already had is unchanged visually. The only edits:
- Chat requests go to `/api/chat` (same origin) instead of directly to
  `api.anthropic.com` — your API key never touches the browser
- Mood, medications, appointments, vitals, and health-log entries are now
  saved to the database (not just kept in page memory) and reloaded
  automatically every time you open the page
- The "+ Add medication / + Add appointment / + Update vitals" buttons now
  open simple prompts and write straight to the database

## Important medical disclaimer

This is a demo/portfolio project. It is **not** a certified medical device and
must not be used for real diagnosis or treatment decisions. The seeded dataset
and AI responses are for general educational purposes only — always direct
real symptoms, medication questions, or mental health concerns to a licensed
healthcare professional.

## Troubleshooting

- **"Server is missing GEMINI_API_KEY"** → you haven't created `.env` yet,
  or it's missing the key. Copy `.env.example` to `.env` and fill it in.
- **"Backend not reachable" notification in the UI** → the server isn't
  running, or you opened `index.html` directly from disk instead of via
  `http://localhost:3000`. Always access it through the server URL.
- **Port already in use** → set `PORT=3001` (or any free port) in `.env`.
- **Want a clean slate?** → stop the server and delete `mediassist.db`
  (and the `-wal`/`-shm` files next to it, if present). It will reseed itself
  on next startup.
