# Pytho Trainer

An AI-powered personal Python tutor. It generates a curriculum tailored to
your goals, builds a roadmap of topics, creates coding exercises and theory
lessons on the fly, grades your work, and keeps adapting until you've
actually mastered each topic — not just gotten one exercise right.

## What it does

- **Curriculum generation** — tell it your goals and current level, and it
  builds a Foundations track plus one track per domain you want to go deeper
  in (ML, Backend, Type Annotations, AI/LLM engineering, ...).
- **Adaptive exercises** — generates a coding exercise, runs your submission
  in a locked-down Docker sandbox, evaluates it with AI (correctness,
  understanding, and an idiomatic-alternative suggestion), and decides what
  happens next: another exercise, a theory lesson, advancing the topic, or
  flagging you as struggling.
- **Theory sessions & exams** — when you're missing fundamentals (or you
  just ask), it writes a short lesson and quiz, and grades your answers.
- **In-exercise tutor** — every exercise ships with an AI-written primer on
  the syntax/concepts it needs, a chat scoped to that exercise (sees your
  current code, never the hidden tests), and a static offline Python
  reference — all in a resizable sidebar.
- **Sandbox** — a separate scratchpad for running arbitrary Python in the
  same sandbox, no grading, nothing saved.
- **Learning overview** — a live view of what you've mastered, where you're
  struggling, and what's next, with an AI-written progress summary.

## Stack

npm workspaces monorepo:

- `apps/server` — Fastify + TypeScript, SQLite (`better-sqlite3`), Anthropic
  Claude API for generation/grading
- `apps/web` — React + Vite, React Query, Monaco editor
- `packages/shared` — Zod schemas and TypeScript types shared by both
- `docker/sandbox` — the locked-down image (no network, read-only filesystem,
  non-root, resource limits) that runs submitted/sandbox code

## Prerequisites

- **Node.js 20+** and npm
- **Docker** (Docker Desktop or any Docker engine), running — exercises and
  the sandbox execute code inside it
- An **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))

## Running it

```bash
git clone https://github.com/danik75/pytho-trainer.git
cd pytho-trainer
./start.sh        # macOS/Linux
start.bat         # Windows
```

The first run will:

1. Check Node and Docker are present and Docker is running
2. Create `.env` from `.env.example` if it doesn't exist yet — **stop here,
   open `.env`, and set `ANTHROPIC_API_KEY`**, then re-run the script
3. Run `npm install` if `node_modules` is missing
4. Build the sandbox Docker image
5. Start the backend (`http://localhost:3001`) and frontend
   (`http://localhost:5173`)

Open **http://localhost:5173** once it's running. `npm start` is an alias for
`./start.sh` (macOS/Linux only — Windows users should run `start.bat`
directly).

### Configuration (`.env`)

| Variable             | Default                 | Meaning                             |
| -------------------- | ----------------------- | ----------------------------------- |
| `ANTHROPIC_API_KEY`  | _(required)_            | Your Anthropic API key              |
| `PORT`               | `3001`                  | Backend port                        |
| `DB_PATH`            | `data/pytho-trainer.db` | SQLite file location                |
| `SANDBOX_IMAGE`      | `pytho-trainer-sandbox` | Docker image tag used to run code   |
| `SANDBOX_TIMEOUT_MS` | `10000`                 | Max wall-clock time per sandbox run |
| `SANDBOX_MEMORY_MB`  | `128`                   | Memory limit per sandbox container  |

## Other scripts

Run from the repo root:

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Start backend + frontend without the setup checks        |
| `npm run build`     | Typecheck and build both apps for production             |
| `npm test`          | Run the backend Jest suite with coverage (80% min)       |
| `npm run test:e2e`  | Build the sandbox image and run a real-Docker smoke test |
| `npm run lint`      | ESLint across the whole repo (zero warnings)             |
| `npm run format`    | Format everything with Prettier                          |
| `npm run typecheck` | TypeScript project-wide typecheck, no emit               |

A pre-commit hook (Husky + lint-staged) runs lint/format on staged files
automatically.

## Notes

- This is a single-user app with no authentication — it's meant to run
  locally for one person.
- `data/` (the SQLite database) and `.env` are gitignored; nothing you store
  in them is committed.
