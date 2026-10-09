#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/publish-content.sh [--dry-run]

Promote content changes from origin/cms-staging to origin/main.
This runs in a temporary git worktree so your current checkout can stay dirty.
EOF
}

dry_run=0
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=1
  shift
fi

if [[ $# -ne 0 ]]; then
  usage >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
remote="origin"
source_branch="cms-staging"
target_branch="main"

cd "$repo_root"

git rev-parse --is-inside-work-tree >/dev/null
git fetch "$remote" "$target_branch" "$source_branch" >/dev/null

for ref in "refs/remotes/$remote/$target_branch" "refs/remotes/$remote/$source_branch"; do
  if ! git show-ref --verify --quiet "$ref"; then
    echo "Missing required ref: $ref" >&2
    exit 1
  fi
done

target_ref="$remote/$target_branch"
source_ref="$remote/$source_branch"

if git merge-base --is-ancestor "$source_ref" "$target_ref"; then
  echo "No content changes to publish. $target_ref already contains $source_ref."
  exit 0
fi

if [[ $dry_run -eq 1 ]]; then
  echo "Commits that would be published from $source_ref to $target_ref:"
  git log --oneline --reverse "$target_ref..$source_ref"
  exit 0
fi

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/kspf-publish-content.XXXXXX")"
worktree_added=0

cleanup() {
  if [[ $worktree_added -eq 1 ]]; then
    git worktree remove --force "$tmp_dir" >/dev/null 2>&1 || true
  fi
  rm -rf "$tmp_dir"
}

trap cleanup EXIT

git worktree add --detach "$tmp_dir" "$target_ref" >/dev/null
worktree_added=1

cd "$tmp_dir"

if git merge-base --is-ancestor "$target_ref" "$source_ref"; then
  git merge --ff-only "$source_ref"
else
  git merge --no-ff --no-edit -m "Publish cms-staging content to main" "$source_ref"
fi

git push "$remote" HEAD:"$target_branch" HEAD:"$source_branch"

echo "Published $source_ref to $remote/$target_branch and synced $remote/$source_branch."
