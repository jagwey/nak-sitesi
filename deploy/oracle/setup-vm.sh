#!/usr/bin/env bash
# Idempotent Ubuntu 24.04 bootstrap for Oracle Cloud Always Free (VM.Standard.E2.1.Micro or A1.Flex).
# Configures 2 GB swap, Docker Engine + Compose plugin, firewall rules for 80/443, and reservation cron.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  exec sudo -E bash "$0" "$@"
fi

APP_DIR="${APP_DIR:-/opt/nakis}"
APP_USER="${SUDO_USER:-ubuntu}"

echo "[1/5] Swap kontrolü (1 GB RAM güvenliği için 2 GB swap)..."
if ! swapon --show | grep -q '/swapfile'; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
fi
if ! grep -q '^/swapfile ' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
cat >/etc/sysctl.d/99-nakis-swap.conf <<'EOF'
vm.swappiness=20
vm.vfs_cache_pressure=50
EOF
sysctl --system >/dev/null

echo "[2/5] Docker Engine ve Compose eklentisi kontrolü..."
if ! command -v docker >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg iptables-persistent
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
fi
if id "$APP_USER" >/dev/null 2>&1; then
  usermod -aG docker "$APP_USER" || true
fi

echo "[3/5] Ubuntu iptables üzerinde yalnızca 80 ve 443 portlarını açma (Oracle varsayılan REJECT kuralının üstüne)..."
open_tcp_port() {
  local port="$1"
  if ! iptables -C INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null; then
    local reject_line
    reject_line="$(iptables -L INPUT --line-numbers -n | awk '/REJECT/ {print $1; exit}')"
    if [ -n "$reject_line" ]; then
      iptables -I INPUT "$reject_line" -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT
    else
      iptables -A INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT
    fi
  fi
}
open_tcp_port 80
open_tcp_port 443
if command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save >/dev/null || true
elif [ -d /etc/iptables ]; then
  iptables-save >/etc/iptables/rules.v4 || true
fi

echo "[4/5] Uygulama dizini hazırlığı: ${APP_DIR}"
mkdir -p "${APP_DIR}/deploy/oracle" "${APP_DIR}/deploy/cloudflare"
if id "$APP_USER" >/dev/null 2>&1; then
  chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
fi
chmod 750 "${APP_DIR}"

echo "[5/5] Stok rezervasyon temizleme cron işi (3 dakikada bir)..."
cat >/etc/cron.d/nakis-release-reservations <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
*/3 * * * * root cd ${APP_DIR} && [ -f .env.production ] && docker compose --env-file .env.production -f docker-compose.prod.yml -f deploy/oracle/docker-compose.micro.yml run --rm --no-deps tools npm run jobs:release-reservations >/var/log/nakis-reservations.log 2>&1
EOF
chmod 644 /etc/cron.d/nakis-release-reservations

echo "Oracle VM ön kurulumu tamamlandı."
