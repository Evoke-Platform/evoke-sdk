#!/usr/bin/env bash
# Download OpenAPI spec snapshots for all Evoke services into .claude/openapi/.
# Run once after scaffolding, and again when the environment changes.
# Agents use `jq` to query these files — never load them into context directly.
#
# Usage: bash scripts/fetch-openapi-specs.sh [base-url]
#   base-url defaults to the value in CLAUDE.md / AGENTS.md / INSTRUCTIONS.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUT="$PROJECT_DIR/.claude/openapi"

# Read base URL from instruction file, or accept as argument
if [ "${1:-}" != "" ]; then
    BASE_URL="${1%/}"
else
    INSTRUCTION_FILE=""
    for f in CLAUDE.md AGENTS.md INSTRUCTIONS.md; do
        if [ -f "$PROJECT_DIR/$f" ]; then
            INSTRUCTION_FILE="$PROJECT_DIR/$f"
            break
        fi
    done
    if [ -z "$INSTRUCTION_FILE" ]; then
        echo "Error: no CLAUDE.md / AGENTS.md / INSTRUCTIONS.md found. Pass the base URL as an argument." >&2
        exit 1
    fi
    BASE_URL=$(grep -oE 'https?://[^ ]+' "$INSTRUCTION_FILE" | grep -v 'raw.githubusercontent' | head -1 || true)
    if [ -z "$BASE_URL" ]; then
        echo "Error: base URL not found in $INSTRUCTION_FILE. Set it there or pass it as an argument." >&2
        exit 1
    fi
    BASE_URL="${BASE_URL%/}"
fi

mkdir -p "$OUT"

declare -A SERVICES=(
    [accessManagement]="$BASE_URL/api/accessManagement/openapi.json"
    [admin]="$BASE_URL/api/admin/openapi.json"
    [data]="$BASE_URL/api/data/openapi.json"
    [mailMerge]="$BASE_URL/api/mailMerge/v3/api-docs"
    [webContent]="$BASE_URL/api/webContent/openapi.json"
    [workflow]="$BASE_URL/api/workflow/openapi.json"
)

echo "Downloading OpenAPI specs from $BASE_URL into .claude/openapi/ ..."
for svc in "${!SERVICES[@]}"; do
    url="${SERVICES[$svc]}"
    dest="$OUT/$svc-api.json"
    if curl -sf "$url" -o "$dest"; then
        version=$(jq -r '.info.version // "unknown"' "$dest" 2>/dev/null || echo "unknown")
        echo "  $svc → $version"
    else
        echo "  $svc → FAILED (curl error for $url)" >&2
        rm -f "$dest"
    fi
done

echo "Done. Query with jq — do not cat these files into context."
