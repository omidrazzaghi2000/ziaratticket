#!/bin/bash
set -e

# ===== KarvanKarbala Production Deployment =====
# Run this script on the VPS as root

SERVER_DIR="/opt/karvankarbala"

echo "====== [1/6] Updating system ======"
apt-get update -y && apt-get install -y curl git rsync

echo "====== [2/6] Installing Docker ======"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "Docker already installed: $(docker --version)"
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  echo "Installing docker-compose..."
  curl -SL https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
else
  echo "Docker Compose already available"
fi

echo "====== [3/6] Preparing project directory ======"
mkdir -p "$SERVER_DIR"
cd "$SERVER_DIR"

echo "====== [4/6] Opening firewall ports ======"
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-service=ssh
  firewall-cmd --permanent --add-service=http
  firewall-cmd --reload
fi

echo "====== [5/6] Building and starting containers ======"
cd "$SERVER_DIR"
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

echo "====== [6/6] Creating Django superuser ======"
echo "Waiting 15s for backend to finish migrations..."
sleep 15
docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'Admin@1234')
    print('Superuser created: admin / Admin@1234')
else:
    print('Superuser already exists')
"

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "  Site:  http://$(curl -s ifconfig.me)/"
echo "  Admin: http://$(curl -s ifconfig.me)/admin/"
echo "  Login: admin / Admin@1234"
echo "============================================"
