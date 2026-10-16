#!/usr/bin/env bash
# =====================================================================
# Instalador automatico — fisco-web
# Sobe o app no EasyPanel/Docker Swarm, cria o .env e aplica migracoes.
# Uso:  ./instalar.sh
# =====================================================================
set -euo pipefail
APP="fisco-web"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

azul(){ printf '\033[1;34m%s\033[0m\n' "$*"; }
ok(){   printf '\033[1;32m  ok\033[0m %s\n' "$*"; }
erro(){ printf '\033[1;31merro:\033[0m %s\n' "$*" >&2; exit 1; }

azul "== instalando $APP =="

command -v docker >/dev/null || erro "docker nao encontrado"
docker compose version >/dev/null 2>&1 || erro "docker compose v2 nao encontrado"

# --- .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  if grep -q '^JWT_SECRET=' .env; then
    SEG="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 40)"
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$SEG|" .env && rm -f .env.bak
    ok "JWT_SECRET gerado"
  fi
  ok ".env criado a partir de .env.example"
  azul "   Edite .env antes de usar em producao (chaves de API e banco)."
else
  ok ".env ja existe, mantido"
fi

# --- rede externa compartilhada do EasyPanel ---
if ! docker network inspect judinfo >/dev/null 2>&1; then
  docker network create judinfo >/dev/null && ok "rede 'judinfo' criada"
else
  ok "rede 'judinfo' ja existe"
fi

azul "-- build --"
docker compose build

azul "-- subindo --"
docker compose up -d



azul ""
azul "== $APP no ar =="
docker compose ps
