#!/usr/bin/env bash

set -euo pipefail

if [[ -f ".env.local" ]]; then
  set -a
  source ".env.local"
  set +a
elif [[ -f ".env" ]]; then
  set -a
  source ".env"
  set +a
fi

exec "$@"
