#!/usr/bin/env bash
#
# Установка FitTrainer на сервер с Ubuntu, рядом с уже работающим порталом.
#
# Запуск от root:
#   bash <(curl -fsSL https://raw.githubusercontent.com/HPaceDev/fitness/main/scripts/install-server.sh)
#
# Если на сервере уже есть Caddy портала (каталог /opt/portal), скрипт добавит
# в его конфиг второй сайт и перезагрузит Caddy: портал продолжит работать по
# своему адресу, FitTrainer откроется по своему. Если Caddy портала нет,
# поднимается собственный. Повторный запуск безопасен.

set -euo pipefail

REPO_URL="https://github.com/HPaceDev/fitness.git"
BRANCH="${BRANCH:-main}"
APP_DIR="/opt/fittrainer"
PORTAL_DIR="/opt/portal"

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m! \033[0m %s\n' "$*" >&2; }
die() { printf '\n\033[1;31mОшибка:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "Запустите от root: sudo bash …"

SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo '')"
[ -n "$SERVER_IP" ] || die "Не удалось определить адрес сервера"
IP_DASHED="${SERVER_IP//./-}"

# --------------------------------------------------------------------------
# Адрес приложения
# --------------------------------------------------------------------------

DOMAIN="${DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  echo
  echo "По какому адресу открывать FitTrainer?"
  echo "  Enter — fit-$IP_DASHED.sslip.io (сертификат выпустится сам, домен покупать не нужно)"
  echo "  или введите свой поддомен, например fit.вашдомен.ru (A-запись должна указывать на $SERVER_IP)"
  read -rp "Адрес: " DOMAIN
  DOMAIN="${DOMAIN:-fit-$IP_DASHED.sslip.io}"
fi
APP_URL="https://$DOMAIN"

DOMAIN_IP="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || echo '')"
if [ -n "$DOMAIN_IP" ] && [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
  warn "Домен $DOMAIN указывает на $DOMAIN_IP, а сервер — $SERVER_IP. Сертификат не выпустится, пока DNS не обновится."
  read -rp "Продолжить всё равно? [y/N] " a; [ "$a" = "y" ] || [ "$a" = "Y" ] || die "Остановлено"
elif [ -z "$DOMAIN_IP" ]; then
  warn "Домен $DOMAIN пока не разрешается. Сертификат появится после настройки DNS."
fi

# --------------------------------------------------------------------------
# Docker, git, исходники
# --------------------------------------------------------------------------

if ! command -v docker >/dev/null 2>&1; then
  say "Устанавливаю Docker"; curl -fsSL https://get.docker.com | sh
fi
command -v git >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq git; }
docker compose version >/dev/null 2>&1 || die "Нет плагина docker compose. Обновите Docker."

if [ -d "$APP_DIR/.git" ]; then
  say "Обновляю исходники в $APP_DIR"
  git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  git -C "$APP_DIR" checkout --quiet "$BRANCH"
  git -C "$APP_DIR" reset --hard --quiet "origin/$BRANCH"
else
  say "Забираю исходники в $APP_DIR"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# --------------------------------------------------------------------------
# Настройки
# --------------------------------------------------------------------------

if [ -f .env ]; then
  say "Файл .env уже есть — пароли сохраняю, адрес обновляю"
  sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env
  grep -q '^DOMAIN=' .env || echo "DOMAIN=$DOMAIN" >> .env
  ADMIN_PASSWORD="$(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2-)"
  ADMIN_PHONE="$(grep '^ADMIN_PHONE=' .env | cut -d= -f2-)"
else
  say "Создаю .env со случайными паролями"
  ADMIN_PHONE="${ADMIN_PHONE:-}"
  if [ -z "$ADMIN_PHONE" ]; then
    read -rp "Ваш телефон для входа в админку (например 79991234567): " ADMIN_PHONE
  fi
  ADMIN_PHONE="$(echo "$ADMIN_PHONE" | tr -cd '0-9')"
  [ "${#ADMIN_PHONE}" = "11" ] || die "Телефон должен быть из 11 цифр, например 79991234567"
  ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-12)"
  umask 077
  cat > .env <<ENV
# Создано автоматически $(date '+%Y-%m-%d %H:%M').
POSTGRES_PASSWORD=$(openssl rand -hex 24)
DOMAIN=$DOMAIN
DEMO=1
ADMIN_PHONE=$ADMIN_PHONE
ADMIN_PASSWORD=$ADMIN_PASSWORD
ENV
  umask 022
fi

# --------------------------------------------------------------------------
# Как выйти наружу: через Caddy портала или свой
# --------------------------------------------------------------------------

PORTAL_CADDY="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^portal[-_]caddy' | head -1 || true)"
COMPOSE_ARGS=()

if [ -n "$PORTAL_CADDY" ] && [ -f "$PORTAL_DIR/Caddyfile" ] && docker network inspect portal_default >/dev/null 2>&1; then
  MODE="portal"
  say "Найден Caddy портала ($PORTAL_CADDY) — добавляю FitTrainer вторым сайтом"
  if ! grep -q "^$DOMAIN {" "$PORTAL_DIR/Caddyfile"; then
    # Дописываем в конец, не пересоздавая файл: он примонтирован в контейнер.
    cat >> "$PORTAL_DIR/Caddyfile" <<CADDY

# FitTrainer (добавлено установщиком /opt/fittrainer)
$DOMAIN {
	reverse_proxy fittrainer-app:3000
	encode zstd gzip
}
CADDY
  fi
else
  MODE="own"
  say "Caddy портала не найден — поднимаю собственный"
  # Без сети портала compose не запустится: убираем её из конфига.
  sed -i '/^      - portal_default$/d; /^networks:$/,/^$/d' docker-compose.yml
  COMPOSE_ARGS=(--profile tls)
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  fi
fi

# --------------------------------------------------------------------------
# Запуск
# --------------------------------------------------------------------------

MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [ "$MEM_MB" -lt 2500 ] && [ ! -f /swapfile ]; then
  say "Памяти ${MEM_MB} МБ — добавляю файл подкачки на время сборки"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile; mkswap /swapfile >/dev/null; swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Собираю и запускаю (первая сборка занимает 3–6 минут)"
docker compose "${COMPOSE_ARGS[@]}" up -d --build

say "Жду готовности приложения"
for i in $(seq 1 90); do
  if docker exec fittrainer-app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    printf '\033[1;32mПриложение отвечает.\033[0m\n'; break
  fi
  [ "$i" = "90" ] && { docker compose logs --tail 40 app; die "Приложение не поднялось за полторы минуты. Логи выше."; }
  sleep 1
done

if [ "$MODE" = "portal" ]; then
  say "Перезагружаю Caddy портала"
  docker exec "$PORTAL_CADDY" caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
    || docker restart "$PORTAL_CADDY" >/dev/null
fi

cat <<FINAL

────────────────────────────────────────────────────────────
Готово.

  Приложение:  $APP_URL
  Админка:     $APP_URL/#/admin  (телефон $ADMIN_PHONE, пароль $ADMIN_PASSWORD)
  Демо-тренер: +7 900 000-00-01, пароль 1234 (кнопки на экране входа)

Сертификат выпускается при первом обращении: если браузер ругается,
подождите минуту и обновите страницу.

Обновить после изменений в коде:
  cd $APP_DIR && git pull && docker compose ${COMPOSE_ARGS[*]:-} up -d --build

Логи:            cd $APP_DIR && docker compose logs -f app
Резервная копия: cd $APP_DIR && docker compose exec db pg_dump -U fittrainer fittrainer | gzip > backup-\$(date +%F).sql.gz
Отключить демо:  в $APP_DIR/.env поставить DEMO=0 и перезапустить (демо-тренера удалить через админку)
────────────────────────────────────────────────────────────
FINAL
