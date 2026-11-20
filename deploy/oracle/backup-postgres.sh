#!/usr/bin/env bash
set -euo pipefail
umask 077

backup_dir=${STATE_DIRECTORY:?Run through nakis-postgres-backup.service}
compose=(docker compose --env-file .env.production -f docker-compose.prod.yml -f deploy/oracle/docker-compose.micro.yml)
stamp=$(date -u +%Y-%m-%dT%H%M%SZ)
archive="$backup_dir/nakis-$stamp.dump"
partial=$(mktemp "$backup_dir/.nakis-$stamp.XXXXXXXX")
trap 'rm -f -- "$partial"' EXIT

"${compose[@]}" exec -T postgres sh -ec \
  'exec pg_dump --format=custom --no-owner --no-acl --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"' >"$partial"
"${compose[@]}" exec -T postgres pg_restore --list <"$partial" >/dev/null
mv -- "$partial" "$archive"
find "$backup_dir" -maxdepth 1 -type f -name 'nakis-????-??-??T??????Z.dump' -mtime +13 -delete
printf 'PostgreSQL backup saved: %s\n' "$archive"
