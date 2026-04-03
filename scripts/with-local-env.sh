#!/usr/bin/env bash

set -euo pipefail

load_env_defaults() {
  local env_file="$1"
  local line
  local key
  local value

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ -z "${line//[[:space:]]/}" || "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"

      if [[ -z "${!key+x}" ]]; then
        eval "export ${key}=${value}"
      fi
    fi
  done < "$env_file"
}

if [[ -f ".env.local" ]]; then
  load_env_defaults ".env.local"
elif [[ -f ".env" ]]; then
  load_env_defaults ".env"
fi

exec "$@"
