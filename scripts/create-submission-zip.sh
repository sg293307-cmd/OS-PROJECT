#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_path="${1:-"$repo_root/../OS-PROJECT-submission.zip"}"

mkdir -p "$(dirname "$output_path")"
rm -f "$output_path"

cd "$repo_root"
zip -r "$output_path" . \
  -x "./node_modules/*" \
     "./.git/*" \
     "./__MACOSX/*" \
     "./dist/*" \
     "./.DS_Store" \
     "*/.DS_Store" \
     "*/__MACOSX/*" \
     "./submission.zip"

printf 'Created %s\n' "$output_path"
