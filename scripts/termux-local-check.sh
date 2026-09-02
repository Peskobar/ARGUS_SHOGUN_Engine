#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_REMOTE="https://github.com/Peskobar/ARGUS_SHOGUN_Engine.git"

printf '\n=== ARGUS SHOGUN · LOCAL CHECK ===\n'

if ! command -v git >/dev/null 2>&1; then
  echo 'Brak git. Instaluję...'
  pkg install -y git
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo 'Brak Node/npm. Instaluję nodejs-lts...'
  pkg install -y nodejs-lts
fi

cd "$ROOT"

if [ ! -d .git ]; then
  echo 'To nie jest klon Git. Uruchom skrypt z repozytorium ARGUS_SHOGUN_Engine.'
  exit 2
fi

git remote set-url origin "$EXPECTED_REMOTE"
git fetch origin main

if git show-ref --verify --quiet refs/heads/main; then
  git checkout main
else
  git checkout -b main origin/main
fi

git reset --hard origin/main

printf '\n=== WERSJA ===\n'
printf 'Branch: '
git branch --show-current
printf 'Commit: '
git rev-parse HEAD
printf 'Node:   '
node --version
printf 'npm:    '
npm --version

cd app

printf '\n=== INSTALL ===\n'
npm install

printf '\n=== CHECK: TYPECHECK + TEST + BUILD ===\n'
npm run check

printf '\n=== START LOKALNY ===\n'
echo 'Otwórz w Chrome na tym telefonie:'
echo 'http://127.0.0.1:3000'
echo
echo 'Zatrzymanie serwera: Ctrl+C'
echo

exec npm run dev -- --host 127.0.0.1
