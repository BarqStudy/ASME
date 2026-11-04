#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
node --input-type=module - <<'JS'
import fs from 'node:fs';import crypto from 'node:crypto';import dotenv from 'dotenv';
if(!fs.existsSync('.env')){const password=crypto.randomBytes(32).toString('hex');fs.writeFileSync('.env',`DATABASE_URL=postgresql://asme:${password}@127.0.0.1:55432/asme_nu\nPOSTGRES_USER=asme\nPOSTGRES_DB=asme_nu\nPOSTGRES_PASSWORD=${password}\nAPP_URL=http://localhost:3000\nUPLOAD_DIR=.data/uploads\nMAIL_MODE=file\n`,{mode:0o600});}
const env=dotenv.parse(fs.readFileSync('.env'));const url=new URL(env.DATABASE_URL);if(!['localhost','127.0.0.1'].includes(url.hostname)||url.port!=='55432'||url.pathname!=='/asme_nu'||url.username!=='asme')throw new Error('Cloud setup only migrates its isolated localhost:55432/asme_nu database. Existing configuration was preserved.');fs.mkdirSync('.data',{recursive:true,mode:0o700});fs.writeFileSync('.data/postgres.env',`POSTGRES_USER=asme\nPOSTGRES_DB=asme_nu\nPOSTGRES_PASSWORD=${decodeURIComponent(url.password)}\n`,{mode:0o600});
JS
npm run db:generate
if [[ -S /var/run/docker.sock ]]; then
  docker_cmd=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
else
  docker_cmd=(docker)
fi
if "${docker_cmd[@]}" container inspect asme-nu-postgres >/dev/null 2>&1; then
  "${docker_cmd[@]}" start asme-nu-postgres >/dev/null
else
  "${docker_cmd[@]}" run -d --name asme-nu-postgres --env-file .data/postgres.env \
    -p 127.0.0.1:55432:5432 -v asme-nu-postgres-data:/var/lib/postgresql postgres:18-bookworm >/dev/null
fi
ready=false
for attempt in {1..30}; do
  if "${docker_cmd[@]}" exec asme-nu-postgres pg_isready -U asme -d asme_nu >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then echo 'Local PostgreSQL did not become ready.' >&2; exit 1; fi
npm run db:migrate
npm run db:seed
npm test
