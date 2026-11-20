#!/usr/bin/env bash
set -euo pipefail
cd /opt/nakis
umask 077

if [[ ! -f .env.storage ]]; then
  cat > .env.storage <<EOF
MINIO_ROOT_USER=nakis-storage-root
MINIO_ROOT_PASSWORD=$(openssl rand -hex 32)
EOF
fi

if [[ ! -f .env.storage.app ]]; then
  cat > .env.storage.app <<EOF
S3_ACCESS_KEY=nakis-app-$(openssl rand -hex 8)
S3_SECRET_KEY=$(openssl rand -hex 24)
EOF
fi

source .env.storage
source .env.storage.app
export MC_HOST_nakis="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@minio:9000"

compose=(docker compose --env-file .env.production
  -f docker-compose.prod.yml -f deploy/oracle/docker-compose.micro.yml
  -f deploy/oracle/docker-compose.storage.yml)
run_mc() {
  "${compose[@]}" run --quiet --rm -T --no-deps -e MC_HOST_nakis minio-client --config-dir /tmp/mc "$@"
}

"${compose[@]}" up -d --no-deps minio
for attempt in {1..15}; do
  if curl -fsS --max-time 2 http://127.0.0.1:9100/minio/health/live >/dev/null; then break; fi
  sleep 2
done
curl -fsS --max-time 2 http://127.0.0.1:9100/minio/health/live >/dev/null

run_mc mb --ignore-existing nakis/nakis-public nakis/nakis-private
run_mc anonymous set-json /policies/public.json nakis/nakis-public
run_mc anonymous set none nakis/nakis-private
run_mc admin policy create nakis nakis-app-objects /policies/app.json
if ! run_mc admin user info nakis "$S3_ACCESS_KEY" >/dev/null 2>&1; then
  run_mc admin user add nakis "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
fi
run_mc admin policy attach nakis nakis-app-objects --user "$S3_ACCESS_KEY" >/dev/null
echo 'MinIO ready. Application S3 credentials written to .env.storage.app.'
