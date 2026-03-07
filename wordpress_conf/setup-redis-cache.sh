#!/bin/sh
set -eu

WP_PATH="${WP_PATH:-/var/www/html}"
WP_CMD="wp --allow-root --path=${WP_PATH}"

echo "Waiting for WordPress core installation..."
attempt=0
max_attempts=120
until ${WP_CMD} core is-installed >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge "${max_attempts}" ]; then
    echo "WordPress is not installed yet. Skipping Redis cache bootstrap for now."
    exit 0
  fi
  sleep 3
done

#
# CRITICAL: Inject Redis PHP constants into wp-config.php
# The redis-cache plugin reads defined('WP_REDIS_HOST') — NOT getenv().
# Docker-compose environment variables alone are invisible to the plugin.
#
echo "Injecting Redis constants into wp-config.php..."
${WP_CMD} config set WP_REDIS_HOST "${WP_REDIS_HOST:-redis}" --type=constant 2>/dev/null || true
${WP_CMD} config set WP_REDIS_PORT "${WP_REDIS_PORT:-6379}" --type=constant --raw 2>/dev/null || true
${WP_CMD} config set WP_REDIS_DATABASE "${WP_REDIS_DATABASE:-0}" --type=constant --raw 2>/dev/null || true
${WP_CMD} config set WP_REDIS_PREFIX "${WP_REDIS_PREFIX:-shriramya:}" --type=constant 2>/dev/null || true
${WP_CMD} config set WP_CACHE_KEY_SALT "${WP_CACHE_KEY_SALT:-shriramya:}" --type=constant 2>/dev/null || true
${WP_CMD} config set WP_CACHE true --type=constant --raw 2>/dev/null || true

echo "Installing and activating redis-cache plugin..."
if ! ${WP_CMD} plugin is-installed redis-cache >/dev/null 2>&1; then
  ${WP_CMD} plugin install redis-cache
fi

${WP_CMD} plugin activate redis-cache >/dev/null 2>&1 || true

echo "Enabling Redis object cache..."
${WP_CMD} redis enable >/dev/null 2>&1 || true

echo "Redis object cache status:"
${WP_CMD} redis status || true

