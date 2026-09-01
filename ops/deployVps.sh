#!/usr/bin/env bash
set -Eeuo pipefail

readonly scriptName="$(basename "$0")"
declare -A configValues=()

log() { printf '\n[%s] %s\n' "$scriptName" "$*"; }
fail() { printf '\n[%s] ERROR: %s\n' "$scriptName" "$*" >&2; exit 1; }

requireRoot() {
  [[ "${EUID}" -eq 0 ]] || fail "Запустите скрипт через sudo."
}

loadConfig() {
  local configPath="$1" line key value
  [[ -f "$configPath" ]] || fail "Не найден config: $configPath"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]] || fail "Неверная строка config: $line"
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    case "$key" in
      DEPLOY_USER|DEPLOY_PATH|GIT_REPOSITORY|GIT_BRANCH|GIT_SSH_KEY_PATH|APP_ENV_FILE|APP_TOKENS_FILE|COMPOSE_FILE|APP_HTTP_PORT|APP_HEALTH_PATH|APP_DOMAIN|LETSENCRYPT_EMAIL|VPS_PUBLIC_IPV4|TIMEZONE|ENABLE_UFW) ;;
      *) fail "Недопустимый ключ config: $key" ;;
    esac
    [[ "$value" != *$'\n'* && "$value" != *'`'* && "$value" != *'$('* ]] || fail "Недопустимое значение для $key"
    configValues["$key"]="$value"
  done < "$configPath"
}

config() { printf '%s' "${configValues[$1]:-}"; }
requireConfig() { [[ -n "$(config "$1")" ]] || fail "Не задан обязательный ключ: $1"; }

validateConfig() {
  local requiredKey
  for requiredKey in DEPLOY_USER DEPLOY_PATH GIT_REPOSITORY GIT_BRANCH GIT_SSH_KEY_PATH APP_ENV_FILE APP_TOKENS_FILE COMPOSE_FILE APP_HTTP_PORT APP_HEALTH_PATH APP_DOMAIN LETSENCRYPT_EMAIL VPS_PUBLIC_IPV4 TIMEZONE ENABLE_UFW; do
    requireConfig "$requiredKey"
  done

  [[ "$(config DEPLOY_PATH)" == /* && "$(config DEPLOY_PATH)" != "/" ]] || fail "DEPLOY_PATH должен быть конкретным абсолютным путём"
  [[ "$(config APP_ENV_FILE)" == /* ]] || fail "APP_ENV_FILE должен быть абсолютным путём"
  [[ "$(config APP_TOKENS_FILE)" == /* ]] || fail "APP_TOKENS_FILE должен быть абсолютным путём"
  [[ "$(config GIT_SSH_KEY_PATH)" == /* ]] || fail "GIT_SSH_KEY_PATH должен быть абсолютным путём"
  [[ "$(config COMPOSE_FILE)" != /* && "$(config COMPOSE_FILE)" != *".."* ]] || fail "COMPOSE_FILE должен быть относительным путём внутри репозитория"
  [[ "$(config APP_DOMAIN)" =~ ^[A-Za-z0-9.-]+$ ]] || fail "Некорректный APP_DOMAIN"
  [[ "$(config LETSENCRYPT_EMAIL)" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || fail "Некорректный LETSENCRYPT_EMAIL"
  [[ "$(config VPS_PUBLIC_IPV4)" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || fail "VPS_PUBLIC_IPV4 должен быть IPv4"
  [[ "$(config APP_HTTP_PORT)" =~ ^[0-9]{2,5}$ ]] && (( $(config APP_HTTP_PORT) > 0 && $(config APP_HTTP_PORT) < 65536 )) || fail "Некорректный APP_HTTP_PORT"
  [[ "$(config APP_HEALTH_PATH)" == /* && "$(config APP_HEALTH_PATH)" != *[[:space:]]* ]] || fail "APP_HEALTH_PATH должен начинаться с /"
  [[ "$(config ENABLE_UFW)" == "true" || "$(config ENABLE_UFW)" == "false" ]] || fail "ENABLE_UFW: true или false"
  id "$(config DEPLOY_USER)" >/dev/null 2>&1 || fail "Не существует DEPLOY_USER: $(config DEPLOY_USER)"
  [[ -r "$(config GIT_SSH_KEY_PATH)" ]] || fail "Не читается GIT_SSH_KEY_PATH"
  [[ -r "$(config APP_ENV_FILE)" ]] || fail "Не читается APP_ENV_FILE"
  [[ -r "$(config APP_TOKENS_FILE)" ]] || fail "Не читается APP_TOKENS_FILE"
  runAsDeployUser test -r "$(config APP_ENV_FILE)" || fail "APP_ENV_FILE должен читаться DEPLOY_USER"
  runAsDeployUser test -r "$(config APP_TOKENS_FILE)" || fail "APP_TOKENS_FILE должен читаться DEPLOY_USER"
}

runAsDeployUser() {
  local deployUser
  deployUser="$(config DEPLOY_USER)"
  runuser -u "$deployUser" -- "$@"
}

installPackages() {
  log "Устанавливаю системные зависимости"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw docker.io dnsutils
  if apt-cache show docker-compose-v2 >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-v2
  elif apt-cache show docker-compose-plugin >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin
  else
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose
  fi
  systemctl enable --now docker nginx
  usermod -aG docker "$(config DEPLOY_USER)"
  timedatectl set-timezone "$(config TIMEZONE)"
}

verifyDns() {
  local resolvedIps
  resolvedIps="$(getent ahostsv4 "$(config APP_DOMAIN)" | awk '{print $1}' | sort -u || true)"
  grep -qx "$(config VPS_PUBLIC_IPV4)" <<< "$resolvedIps" || fail "DNS $(config APP_DOMAIN) не указывает на $(config VPS_PUBLIC_IPV4). Исправьте A-запись и повторите запуск."
}

syncRepository() {
  local deployPath repository branch sshKey
  deployPath="$(config DEPLOY_PATH)"; repository="$(config GIT_REPOSITORY)"; branch="$(config GIT_BRANCH)"; sshKey="$(config GIT_SSH_KEY_PATH)"
  install -d -o "$(config DEPLOY_USER)" -g "$(config DEPLOY_USER)" -m 750 "$deployPath"
  if [[ -d "$deployPath/.git" ]]; then
    runAsDeployUser env GIT_SSH_COMMAND="ssh -i $sshKey -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git -C "$deployPath" fetch origin "$branch"
    runAsDeployUser git -C "$deployPath" diff --quiet || fail "В deploy checkout есть локальные изменения: $deployPath"
    runAsDeployUser git -C "$deployPath" checkout "$branch"
    runAsDeployUser git -C "$deployPath" pull --ff-only origin "$branch"
  else
    [[ -z "$(find "$deployPath" -mindepth 1 -maxdepth 1 -print -quit)" ]] || fail "DEPLOY_PATH не пуст и не является Git-репозиторием"
    runAsDeployUser env GIT_SSH_COMMAND="ssh -i $sshKey -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git clone --branch "$branch" --single-branch "$repository" "$deployPath"
  fi
}

configureFirewall() {
  [[ "$(config ENABLE_UFW)" == "true" ]] || return
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

configureNginx() {
  local domain template output
  domain="$(config APP_DOMAIN)"
  template="$(config DEPLOY_PATH)/ops/nginx/relayform.conf.template"
  output="/etc/nginx/sites-available/$domain"
  [[ -f "$template" ]] || fail "Не найден Nginx template: $template"
  if [[ ! -e "/etc/letsencrypt/live/$domain/fullchain.pem" ]]; then
    sed -e "s|__APP_DOMAIN__|$domain|g" -e "s|__APP_HTTP_PORT__|$(config APP_HTTP_PORT)|g" "$template" > "$output"
    ln -sfn "$output" "/etc/nginx/sites-enabled/$domain"
    rm -f /etc/nginx/sites-enabled/default
  fi
  nginx -t
  systemctl reload nginx
}

composeCommand() {
  if docker compose version >/dev/null 2>&1; then printf '%s\n' "docker compose"; else printf '%s\n' "docker-compose"; fi
}

startApplication() {
  local composeFile composeText
  composeFile="$(config DEPLOY_PATH)/$(config COMPOSE_FILE)"
  [[ -f "$composeFile" ]] || fail "Не найден Compose файл: $composeFile. Добавьте его в первый implementation PR."
  composeText="$(composeCommand)"
  runAsDeployUser env APP_ENV_FILE="$(config APP_ENV_FILE)" APP_TOKENS_FILE="$(config APP_TOKENS_FILE)" bash -lc "cd '$(config DEPLOY_PATH)' && $composeText -f '$composeFile' up --build --detach --remove-orphans"
  local attempt
  for attempt in {1..30}; do
    if curl --fail --silent --show-error "http://127.0.0.1:$(config APP_HTTP_PORT)$(config APP_HEALTH_PATH)" >/dev/null; then return; fi
    sleep 2
  done
  fail "Health endpoint не ответил: $(config APP_HEALTH_PATH)"
}

provisionCertificate() {
  local domain email
  domain="$(config APP_DOMAIN)"; email="$(config LETSENCRYPT_EMAIL)"
  if [[ -e "/etc/letsencrypt/live/$domain/fullchain.pem" ]]; then
    certbot renew --quiet
  else
    certbot --nginx --non-interactive --agree-tos --email "$email" --redirect -d "$domain"
  fi
}

main() {
  [[ $# -eq 1 ]] || fail "Использование: sudo bash ops/deployVps.sh /etc/relayform/deploy.env"
  requireRoot
  loadConfig "$1"
  validateConfig
  installPackages
  verifyDns
  syncRepository
  configureFirewall
  configureNginx
  startApplication
  provisionCertificate
  log "Развёртывание завершено: https://$(config APP_DOMAIN)"
}

main "$@"
