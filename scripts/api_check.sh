#!/usr/bin/env bash
set -u

BASE_URL="${1:-http://localhost:8000/api/v1}"

declare -a ENDPOINTS=(
  "/health"
  "/products"
  "/products/categories"
  "/blog/posts"
)

printf "API connectivity check against %s\n" "$BASE_URL"
printf '%0.s-' {1..60}; echo

any_fail=0
for path in "${ENDPOINTS[@]}"; do
  code=$(curl -sS -o /tmp/api_check_body.json -w '%{http_code}' "$BASE_URL$path" 2>/tmp/api_check_err.log)
  curl_exit=$?

  if [[ $curl_exit -ne 0 ]]; then
    any_fail=1
    err_msg=$(cat /tmp/api_check_err.log)
    printf "❌ GET %s -> curl error (%s)\n" "$path" "$err_msg"
  elif [[ "$code" =~ ^2|3 ]]; then
    printf "✅ GET %s -> HTTP %s\n" "$path" "$code"
  else
    any_fail=1
    body=$(head -c 200 /tmp/api_check_body.json)
    printf "❌ GET %s -> HTTP %s | %s\n" "$path" "$code" "$body"
  fi
done

printf '%0.s-' {1..60}; echo
if [[ $any_fail -eq 0 ]]; then
  echo "All checked endpoints responded successfully."
  exit 0
fi

echo "One or more endpoints are unreachable or failing."
exit 1
