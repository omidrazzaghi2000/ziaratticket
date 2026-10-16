#!/bin/bash
set -e

# ===== KarvanKarbala Production Deployment =====
# Run on VPS as root: bash deploy.sh
# Domain: ziaratticket.ir  |  Server: 213.176.121.111

SERVER_DIR="/opt/karvankarbala"

echo "====== [1/9] Updating system ======"
apt-get update -y && apt-get install -y curl git rsync ufw

echo "====== [2/9] Installing Docker ======"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "Docker already installed: $(docker --version)"
fi

echo "====== [3/9] Opening firewall ports ======"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "====== [4/9] Preparing project directory ======"
mkdir -p "$SERVER_DIR"
mkdir -p "$SERVER_DIR/nginx/conf.d"
mkdir -p "$SERVER_DIR/nginx/certbot/conf"
mkdir -p "$SERVER_DIR/nginx/certbot/www"

echo ""
echo ">>> Copy project files to $SERVER_DIR before continuing."
echo ">>> If using git: cd $SERVER_DIR && git pull origin djangoJust"
echo ">>> Also ensure .env file exists at $SERVER_DIR/.env (copy from .env.example)"
echo ">>> For Bale booking notices it needs BALE_BOT_TOKEN, BALE_WEBHOOK_SECRET and"
echo ">>> BALE_BOT_USERNAME (BALE_FALLBACK_CHAT_ID optional) — all listed in .env.example"
echo ""
read -p "Press Enter when project files and .env are ready in $SERVER_DIR ..."

cd "$SERVER_DIR"

# Load env vars for this script
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "ERROR: .env file not found. Create it from .env.example first."
  exit 1
fi

DOMAIN=$(echo "$ALLOWED_HOSTS" | cut -d',' -f1)
EMAIL="$CERTBOT_EMAIL"

echo "====== [5/9] Starting services (HTTP only for cert issuance) ======"
cp nginx/conf.d/default.conf nginx/conf.d/active.conf

docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d db backend frontend nginx-proxy

echo "Waiting 25s for services to start..."
sleep 25

echo "====== [6/9] Issuing Let's Encrypt certificate for $DOMAIN ======"
if [ ! -f "nginx/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "Requesting certificate..."
  docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"
else
  echo "Certificate already exists — skipping issuance."
fi

echo "====== [7/9] Switching to HTTPS config and reloading nginx ======"
cp nginx/ssl.conf nginx/conf.d/default.conf
docker compose -f docker-compose.prod.yml restart nginx-proxy
docker compose -f docker-compose.prod.yml up -d certbot

echo "====== [8/9] Creating Django superuser ======"
sleep 10
docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_staff=True).exists():
    u = User(phone='09000000000', is_staff=True, is_superuser=True)
    u.set_password('Admin@1234')
    u.save()
    print('Superuser created: phone=09000000000 / Admin@1234')
else:
    print('Superuser already exists')
" 2>/dev/null || true

echo "====== [9/9] Registering the Bale bot webhook ======"
# Lets a caravan leader connect their own Bale chat from their dashboard, with
# no admin step. This can only run here: the webhook URL carries this server's
# own BALE_WEBHOOK_SECRET, so registering it from a laptop would point the live
# bot at a URL this server rejects.
# Note: once a webhook is set, Bale stops serving getUpdates, so the bare
# "manage.py bale_chat_ids" listing goes quiet. That is expected — the leader's
# connection-code flow replaces it.
if [ -n "$BALE_BOT_TOKEN" ] && [ -n "$BALE_WEBHOOK_SECRET" ]; then
  if docker compose -f docker-compose.prod.yml exec -T backend \
      python manage.py bale_chat_ids --set-webhook "https://$DOMAIN"; then
    echo "Webhook registered — the URL is printed above. Idempotent, safe to re-run."
  else
    echo "WARNING: webhook registration failed; deployment continues. Fix .env or the"
    echo "         bot token and re-run the command above — booking notices still work."
  fi
else
  echo "Bale bot not configured (BALE_BOT_TOKEN or BALE_WEBHOOK_SECRET empty) — skipping; booking notices stay off."
fi

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "  Site:  https://$DOMAIN/"
echo "  Admin: https://$DOMAIN/admin/"
echo "============================================"
