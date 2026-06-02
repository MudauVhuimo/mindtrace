# MindTrace

**mind-trace.studio** — Beautiful, expert-style cognitive traces for school analytical questions (math, physics, chemistry, proofs, definitions, calculations...).

Type or screenshot a problem → Gemini (via secure server proxy) produces:
- Layered thinking trace with symbolic translations
- Prerequisites (KnowledgeMap)
- Pattern for "when you see this again"
- Clean exam-style final solution (no spurious numbering on calc answers, full KaTeX + **markdown** support)

Strictly dark, flat, zero-distraction UI. Keyboard, wheel, swipe, dot, and "New Analysis" navigation that never gets stuck.

## Live site
https://mind-trace.studio (deploy your copy and point the domain)

## Run locally

```bash
cd frontend
npm install

# 1. Get a free Gemini key: https://aistudio.google.com/app/apikey
# 2. 
cat > .env.local << EOF
GEMINI_API_KEY=your_key_here
EOF

npm run dev
```

App runs at http://localhost:3000 (Vite dev + Express API on same port).

## Build & self-host

```bash
cd frontend
npm run build
NODE_ENV=production npm start
# or: node dist/server.cjs
```

`dist/` contains the client + the production `server.cjs` (Express that serves the SPA + `/api/generate-trace`).

## Deploy (recommended for mind-trace.studio)

Use any Node-friendly host:

- **Render**, **Railway**, **Fly.io** (easiest)
  - Root dir: `frontend`
  - Build: `npm ci && npm run build`
  - Start: `npm run start`
  - Env: `GEMINI_API_KEY=...`
  - Add custom domain `mind-trace.studio` in dashboard + configure DNS (CNAME usually)

- Vercel / Cloud Run / etc. also fine (the server listens on `process.env.PORT`).

The key never leaves the server. Client only talks to your `/api`.

## Repository layout (what you push to GitHub)

```
MindTrace/
├── frontend/          # ← the real app (React + server proxy + all the magic)
│   ├── src/App.tsx    # UI, navigation, history, share, renderTextWithMath (formatting hero)
│   ├── server.ts      # Express routes + Gemini call + heavy cleaning/sanitizing
│   ├── package.json
│   └── ...
├── src/main/java/...  # Legacy Java data model (reference only — not used by the site)
├── pom.xml
├── Readme.md          # You are here
└── .gitignore
```

The Java sources are kept for history / if you ever want to port the model. For the hosted site they are irrelevant.

### Fixing VS Code red squiggles on the Java imports (`com.google.genai.*`, Gson, etc.)

The `src/main/java` + `pom.xml` contain the original reference implementation (data model records + a `GeminiTraceGenerator` that talks to Gemini using the official Google GenAI **Java** SDK + structured output).

If after cloning you open a `.java` file and see red squiggly lines under the imports:

1. Install the VS Code "Extension Pack for Java" (or at minimum "Language Support for Java™ by Red Hat" + "Maven for Java").
2. From the repo root run:
   ```bash
   ./mvnw dependency:copy-dependencies -DoutputDirectory=lib
   ./mvnw compile
   ```
   (The `mvnw` script now auto-downloads the Maven distribution the very first time you run it — the full dist is gitignored so the repo stays small.)
3. In VS Code press `Cmd/Ctrl+Shift+P`, type "Java: Clean Java Language Server Workspace", run it, then "Reload Window".

This creates `lib/` (40+ jars — gitignored) containing `google-genai-1.56.0.jar`, `gson-2.11.0.jar` and every transitive dependency, plus `target/classes`. The committed `.vscode/settings.json` tells the Java language server to treat `lib/**/*.jar` + `target/classes` as the project classpath.

You only need to do the mvn step once per machine (or after a `git clean -fdx`).

The **live hosted site** (the React app at mind-trace.studio) does **not** use any of this Java code — the Gemini calls and all the formatting logic live in `frontend/server.ts` (Node) and `frontend/src/App.tsx`.

If you only ever want the web app you can delete the Java/Maven files (`src/`, `pom.xml`, `mvnw*`, `.mvn/`) with no effect on the product.

## Formatting guarantees (why it looks perfect on both typed & images)

- Prompt is extremely strict about "what/why = natural English only", "translation = pure KaTeX or exactly null"
- Server: `cleanString` + `sanitizeTranslation` (cuts prose leaks like "Read Problem 1: ...", "Since ...", dedupes, extracts only math chunks, normalizes newlines & escapes)
- Client: same cleans on load + `renderTextWithMath` (line-aware, bare-latex fallback, **bold**/**italic**, handles \n, nulls, over-escaped \\, mixed text+math)
- Final solution: leading numbers stripped from workings (you don't write "1." in an exam box)
- Leaks like full problem statement repeated in trace fields are stripped for both input modes
- Result: consistent structure + beautiful output whether you typed the question or attached screenshots.

## Sharing

"Share" produces tiny `?state=...` links (url-safe base64 of the trace only — problem statement lives inside the trace so no duplication, images intentionally omitted so links stay copy-paste friendly even for long problems).

## Tech

- UI: React + TS + Vite + Tailwind + framer-motion + KaTeX + lucide
- API: Express + @google/genai (server only)
- All the "it just works" formatting & UX polish lives in `frontend/`

## Environment

- `GEMINI_API_KEY` (server only)
- `PORT` (auto-set by hosts)

See `frontend/.env.example`.

## Contributing / etc

MIT. The goal is a production-grade, delightful tool for students who want to *understand* how experts actually think, not just see the final line.

Enjoy the traces!
