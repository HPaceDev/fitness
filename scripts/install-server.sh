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
NONINTERACTIVE="${NONINTERACTIVE:-0}"
# Повторный запуск (в том числе из GitHub Actions): адрес берём из .env
if [ -z "$DOMAIN" ] && [ -f "$APP_DIR/.env" ]; then
  DOMAIN="$(grep '^DOMAIN=' "$APP_DIR/.env" | cut -d= -f2- || true)"
fi
if [ -z "$DOMAIN" ] && [ "$NONINTERACTIVE" = "1" ]; then
  DOMAIN="fit-$IP_DASHED.sslip.io"
fi
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
  if [ "$NONINTERACTIVE" != "1" ]; then
    read -rp "Продолжить всё равно? [y/N] " a; [ "$a" = "y" ] || [ "$a" = "Y" ] || die "Остановлено"
  fi
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

# Репозиторий публичный: логин GitHub не нужен. Отключаем запрос пароля и
# любые сохранённые на сервере учётные данные git, чтобы clone не спрашивал.
export GIT_TERMINAL_PROMPT=0
G() { git -c credential.helper= "$@"; }

TARBALL_URL="https://codeload.github.com/HPaceDev/fitness/tar.gz/refs/heads/$BRANCH"
SSH_REPO="git@github.com:HPaceDev/fitness.git"
DEPLOY_KEY="/root/.ssh/fittrainer_deploy"

# Заменяет содержимое $APP_DIR исходниками из архива, сохраняя .env
unpack_tarball() {
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "$TARBALL_URL" -o "$tmp/src.tgz" || { rm -rf "$tmp"; return 1; }
  mkdir -p "$APP_DIR"
  [ -f "$APP_DIR/.env" ] && cp "$APP_DIR/.env" "$tmp/.env.keep"
  find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name .env -exec rm -rf {} +
  tar -xzf "$tmp/src.tgz" --strip-components=1 -C "$APP_DIR" || { rm -rf "$tmp"; return 1; }
  [ -f "$tmp/.env.keep" ] && cp "$tmp/.env.keep" "$APP_DIR/.env"
  rm -rf "$tmp"
  return 0
}

fetch_sources() {
  # 1. Обычный git по HTTPS
  if [ -d "$APP_DIR/.git" ]; then
    say "Обновляю исходники в $APP_DIR"
    if G -C "$APP_DIR" fetch --quiet origin "$BRANCH" 2>/tmp/fittrainer-git.log; then
      G -C "$APP_DIR" checkout --quiet "$BRANCH"
      G -C "$APP_DIR" reset --hard --quiet "origin/$BRANCH"
      return 0
    fi
    warn "git fetch не прошёл: $(tail -1 /tmp/fittrainer-git.log)"
  else
    say "Забираю исходники в $APP_DIR"
    rm -rf "$APP_DIR.tmp"
    if G clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR.tmp" 2>/tmp/fittrainer-git.log; then
      [ -f "$APP_DIR/.env" ] && cp "$APP_DIR/.env" "$APP_DIR.tmp/.env"
      rm -rf "$APP_DIR"; mv "$APP_DIR.tmp" "$APP_DIR"
      return 0
    fi
    warn "git clone не прошёл: $(tail -1 /tmp/fittrainer-git.log)"
  fi

  # 2. Архив с GitHub (другой хост, часто доступен, когда git по HTTPS нет)
  say "Пробую скачать архив кода"
  if unpack_tarball; then
    printf '\033[1;32mАрхив скачан.\033[0m\n'
    return 0
  fi
  warn "Архив тоже не скачался."

  # 3. SSH с деплой-ключом
  say "Последний способ — git по SSH с ключом сервера"
  if [ ! -f "$DEPLOY_KEY" ]; then
    mkdir -p /root/.ssh && chmod 700 /root/.ssh
    ssh-keygen -q -t ed25519 -N "" -C "fittrainer-deploy@$(hostname)" -f "$DEPLOY_KEY"
  fi
  [ "$NONINTERACTIVE" != "1" ] || die "Код не скачался ни git, ни архивом"
  echo
  echo "Добавьте этот ключ в репозиторий: https://github.com/HPaceDev/fitness/settings/keys"
  echo "  Add deploy key → Title: сервер → Key: строка ниже → Allow write access НЕ ставить"
  echo
  cat "$DEPLOY_KEY.pub"
  echo
  read -rp "Когда ключ добавлен, нажмите Enter… " _
  export GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  rm -rf "$APP_DIR.tmp"
  if git clone --quiet --branch "$BRANCH" "$SSH_REPO" "$APP_DIR.tmp"; then
    [ -f "$APP_DIR/.env" ] && cp "$APP_DIR/.env" "$APP_DIR.tmp/.env"
    rm -rf "$APP_DIR"; mv "$APP_DIR.tmp" "$APP_DIR"
    # Чтобы git pull дальше работал без переменных окружения
    git -C "$APP_DIR" config core.sshCommand "$GIT_SSH_COMMAND"
    return 0
  fi
  return 1
}

fetch_sources || die "Код так и не скачался. Пришлите вывод команд: curl -I https://github.com ; curl -I $TARBALL_URL ; ssh -T git@github.com"

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
  grep -q '^TELEGRAM_BOT_TOKEN=' .env || echo "TELEGRAM_BOT_TOKEN=" >> .env
  grep -q '^TZ=' .env || echo "TZ=Europe/Moscow" >> .env
else
  say "Создаю .env со случайными паролями"
  ADMIN_PHONE="${ADMIN_PHONE:-}"
  if [ -z "$ADMIN_PHONE" ] && [ "$NONINTERACTIVE" != "1" ]; then
    read -rp "Ваш телефон для входа в админку (например 79991234567): " ADMIN_PHONE
  fi
  [ -n "$ADMIN_PHONE" ] || die "Первый запуск нужно сделать вручную: скрипт спросит телефон администратора"
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
# Токен бота от @BotFather — включает уведомления в Telegram
TELEGRAM_BOT_TOKEN=
TZ=Europe/Moscow
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

Обновить после изменений в коде (скрипт сам скачает свежий код и пересоберёт):
  bash <(curl -fsSL https://raw.githubusercontent.com/HPaceDev/fitness/main/scripts/install-server.sh)

Автодеплой при пуше в main:  bash $APP_DIR/scripts/setup-autodeploy.sh
Telegram-уведомления:         вписать токен бота в $APP_DIR/.env (TELEGRAM_BOT_TOKEN=...) и перезапустить скрипт
Логи:            cd $APP_DIR && docker compose logs -f app
Резервная копия: cd $APP_DIR && docker compose exec db pg_dump -U fittrainer fittrainer | gzip > backup-\$(date +%F).sql.gz
Отключить демо:  в $APP_DIR/.env поставить DEMO=0 и перезапустить (демо-тренера удалить через админку)
────────────────────────────────────────────────────────────
FINAL
