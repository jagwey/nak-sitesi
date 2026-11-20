#!/usr/bin/env bash
# Idempotent Oracle Cloud Always Free VM bootstrap (Oracle Linux 9 / RHEL 9 and Ubuntu 24.04).
# Configures 2 GB extra swap, Docker Engine + Compose plugin, firewall rules for 80/443, and reservation cron.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  exec sudo -E bash "$0" "$@"
fi

APP_DIR="${APP_DIR:-/opt/nakis}"
APP_USER="${SUDO_USER:-opc}"
if ! id "$APP_USER" >/dev/null 2>&1; then
  if id opc >/dev/null 2>&1; then
    APP_USER="opc"
  elif id ubuntu >/dev/null 2>&1; then
    APP_USER="ubuntu"
  fi
fi

. /etc/os-release

echo "[1/5] Swap kontrolü (1 GB RAM için en az 2 GB swap)..."
TOTAL_SWAP_MB="$(free -m | awk '/^Swap:/ {print $2}')"
if [ "${TOTAL_SWAP_MB:-0}" -lt 2048 ]; then
  SWAP_PATH="/swapfile-nakis"
  if ! swapon --show | grep -q "$SWAP_PATH"; then
    if [ ! -f "$SWAP_PATH" ]; then
      fallocate -l 2G "$SWAP_PATH" || dd if=/dev/zero of="$SWAP_PATH" bs=1M count=2048 status=none
      chmod 600 "$SWAP_PATH"
      mkswap "$SWAP_PATH"
    fi
    swapon "$SWAP_PATH"
  fi
  if ! grep -q "^${SWAP_PATH} " /etc/fstab; then
    echo "${SWAP_PATH} none swap sw 0 0" >> /etc/fstab
  fi
fi
cat >/etc/sysctl.d/99-nakis-swap.conf <<'EOF'
vm.swappiness=20
vm.vfs_cache_pressure=50
EOF
sysctl --system >/dev/null

echo "[2/5] Docker Engine ve Compose eklentisi kontrolü (${ID} ${VERSION_ID:-})..."
if ! command -v docker >/dev/null 2>&1; then
  if [ "$ID" = "ol" ] || [ "$ID" = "rhel" ] || [ "$ID" = "rocky" ] || [ "$ID" = "almalinux" ]; then
    dnf install -y dnf-plugins-core cronie
    dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now crond || true
    systemctl enable --now docker
  else
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg iptables-persistent cron
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
      >/etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
  fi
fi
if id "$APP_USER" >/dev/null 2>&1; then
  usermod -aG docker "$APP_USER" || true
fi

echo "[3/5] Güvenlik duvarında yalnızca 80 ve 443 portlarını açma..."
if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
  systemctl restart docker
else
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
