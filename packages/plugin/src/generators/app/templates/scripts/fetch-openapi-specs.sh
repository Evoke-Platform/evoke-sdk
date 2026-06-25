#!/usr/bin/env bash
# Download OpenAPI spec snapshots for all Evoke services into .openapi/.
# Run once after scaffolding, and again when the environment changes.
# Agents use `jq` to query these files — never load them into context directly.
#
# Usage: bash scripts/fetch-openapi-specs.sh [base-url]
#   base-url defaults to the value in CLAUDE.md / AGENTS.md / INSTRUCTIONS.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUT="$PROJECT_DIR/.openapi"

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

echo "Downloading OpenAPI specs from $BASE_URL into .openapi/ ..."
for svc in accessManagement admin data mailMerge webContent workflow; do
    case "$svc" in
        accessManagement) url="$BASE_URL/api/accessManagement/openapi.json" ;;
        admin) url="$BASE_URL/api/admin/openapi.json" ;;
        data) url="$BASE_URL/api/data/openapi.json" ;;
        mailMerge) url="$BASE_URL/api/mailMerge/v3/api-docs" ;;
        webContent) url="$BASE_URL/api/webContent/openapi.json" ;;
        workflow) url="$BASE_URL/api/workflow/openapi.json" ;;
    esac
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
