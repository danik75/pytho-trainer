#!/usr/bin/env bash
# Sets up (if needed) and starts Pytho Trainer: installs dependencies, builds
# the sandbox Docker image, makes sure an .env file exists, then runs the
# backend and frontend dev servers together.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Checking prerequisites"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found. Install Node 20+ and re-run this script." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required (it runs submitted code in a locked-down sandbox) but was not found." >&2
  echo "Install Docker Desktop (or another Docker engine), make sure it's running, and re-run this script." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but doesn't seem to be running. Start Docker and re-run this script." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "==> No .env file found - creating one from .env.example"
  cp .env.example .env
  echo
  echo "Open .env and set ANTHROPIC_API_KEY to your Anthropic API key, then re-run ./start.sh." >&2
  exit 1
fi

if ! grep -q '^ANTHROPIC_API_KEY=.\+' .env; then
  echo "ANTHROPIC_API_KEY is not set in .env - add your Anthropic API key there, then re-run ./start.sh." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "==> Installing dependencies (npm install)"
  npm install
fi

echo "==> Building the sandbox Docker image (used to run submitted/sandbox code)"
docker build -t pytho-trainer-sandbox docker/sandbox

echo "==> Starting the backend (http://localhost:3001) and frontend (http://localhost:5173)"
exec npm run dev
