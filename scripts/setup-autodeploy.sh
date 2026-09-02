#!/usr/bin/env bash
#
# Готовит автодеплой: создаёт на сервере SSH-ключ для GitHub Actions и
# печатает, что вставить в секреты репозитория.
#
# Запуск на сервере от root:
#   bash /opt/fittrainer/scripts/setup-autodeploy.sh
set -euo pipefail

KEY=/root/.ssh/github_actions_deploy
mkdir -p /root/.ssh && chmod 700 /root/.ssh
if [ ! -f "$KEY" ]; then
  ssh-keygen -q -t ed25519 -N "" -C "github-actions-deploy" -f "$KEY"
fi
grep -qF "$(cat "$KEY.pub")" /root/.ssh/authorized_keys 2>/dev/null || cat "$KEY.pub" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"

cat <<MSG

────────────────────────────────────────────────────────────
Откройте https://github.com/HPaceDev/fitness/settings/secrets/actions
и добавьте два секрета (New repository secret):

  Name:  SSH_HOST
  Value: $IP

  Name:  SSH_KEY
  Value: (весь текст ниже, включая строки BEGIN и END)

MSG
cat "$KEY"
cat <<MSG

После этого каждый пуш в main будет сам обновлять сервер.
Проверить: https://github.com/HPaceDev/fitness/actions
────────────────────────────────────────────────────────────
MSG
