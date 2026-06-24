
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCOPE="${GRAPHIFY_SCOPE_DIR:-/private/tmp/wastegrab-graphify-scope}"
MODE="${1:-label}"
PYTHON_FILE="$ROOT/graphify-out/.graphify_python"
LM_STUDIO_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:1234/v1}"
LM_STUDIO_MODEL="${OLLAMA_MODEL:-qwen/qwen3.6-27b}"

cd "$ROOT"

if [[ ! -f "$PYTHON_FILE" ]]; then
  mkdir -p graphify-out
  if command -v uv >/dev/null 2>&1; then
    uv tool run graphifyy python -c "import sys; open('$PYTHON_FILE', 'w', encoding='utf-8').write(sys.executable)"
  else
    python3 -c "import sys; open('$PYTHON_FILE', 'w', encoding='utf-8').write(sys.executable)"
  fi
fi

rm -rf "$SCOPE"
mkdir -p \
  "$SCOPE/apps/backend/src" \
  "$SCOPE/apps/frontend/src/app" \
  "$SCOPE/apps/frontend/src/environments" \
  "$SCOPE/apps/e2e" \
  "$SCOPE/libs/shared"

cp -R apps/backend/src/routes "$SCOPE/apps/backend/src/routes"
cp -R apps/backend/src/services "$SCOPE/apps/backend/src/services"
cp -R apps/backend/src/middleware "$SCOPE/apps/backend/src/middleware"
cp -R apps/backend/src/utils "$SCOPE/apps/backend/src/utils"
cp apps/backend/src/app.ts "$SCOPE/apps/backend/src/app.ts"
cp apps/backend/src/config.ts "$SCOPE/apps/backend/src/config.ts"
cp apps/backend/src/prisma.ts "$SCOPE/apps/backend/src/prisma.ts"

cp -R apps/frontend/src/app/services "$SCOPE/apps/frontend/src/app/services"
cp -R apps/frontend/src/app/pages "$SCOPE/apps/frontend/src/app/pages"
cp apps/frontend/src/app/app.routes.ts "$SCOPE/apps/frontend/src/app/app.routes.ts"
cp apps/frontend/src/app/app-route-paths.ts "$SCOPE/apps/frontend/src/app/app-route-paths.ts"
cp apps/frontend/src/environments/environment.ts "$SCOPE/apps/frontend/src/environments/environment.ts"
cp apps/frontend/src/environments/environment.prod.ts "$SCOPE/apps/frontend/src/environments/environment.prod.ts"

cp -R apps/e2e/src "$SCOPE/apps/e2e/src"
cp apps/e2e/playwright.config.ts "$SCOPE/apps/e2e/playwright.config.ts"
cp apps/e2e/package.json "$SCOPE/apps/e2e/package.json"
if [[ -f apps/e2e/tsconfig.json ]]; then
  cp apps/e2e/tsconfig.json "$SCOPE/apps/e2e/tsconfig.json"
fi

cp -R libs/shared/types "$SCOPE/libs/shared/types"

check_local_llm() {
  if [[ "${GRAPHIFY_BACKEND:-ollama}" != "ollama" ]]; then
    return
  fi

  python3 - "$LM_STUDIO_URL" "$LM_STUDIO_MODEL" <<'PY'
import json
import sys
import urllib.error
import urllib.request

base_url = sys.argv[1].rstrip("/")
model = sys.argv[2]
url = f"{base_url}/models"

try:
    with urllib.request.urlopen(url, timeout=5) as response:
        payload = json.loads(response.read().decode("utf-8"))
except Exception as exc:
    print(
        "[graphify] LM Studio local server is not reachable.\n"
        f"[graphify] Expected: {url}\n"
        "[graphify] Start LM Studio, load a model, enable the local server, then rerun this task.\n"
        f"[graphify] Error: {exc}",
        file=sys.stderr,
    )
    raise SystemExit(1)

models = [item.get("id") for item in payload.get("data", []) if item.get("id")]
if model not in models:
    print(
        "[graphify] LM Studio is running, but the requested model is not loaded.\n"
        f"[graphify] Requested: {model}\n"
        f"[graphify] Available: {', '.join(models) or '(none)'}\n"
        "[graphify] Load the model in LM Studio or set OLLAMA_MODEL to one of the available ids.",
        file=sys.stderr,
    )
    raise SystemExit(1)

print(f"[graphify] LM Studio ready: {model} at {base_url}")
PY
}

run_graphify() {
  if [[ "${GRAPHIFY_USE_UV:-1}" == "1" ]] && command -v uv >/dev/null 2>&1; then
    rtk uv tool run --from graphifyy --with openai graphify "$@"
  else
    rtk "$(cat "$PYTHON_FILE")" -m graphify "$@"
  fi
}

case "$MODE" in
  ast)
    run_graphify update "$SCOPE" --force
    ;;
  label)
    if [[ -n "${OLLAMA_BASE_URL:-}${OLLAMA_MODEL:-}" || "${GRAPHIFY_BACKEND:-ollama}" == "ollama" ]]; then
      check_local_llm
      export OLLAMA_BASE_URL="$LM_STUDIO_URL"
      export OLLAMA_MODEL="$LM_STUDIO_MODEL"
      export OLLAMA_API_KEY="${OLLAMA_API_KEY:-lm-studio}"
    fi
    run_graphify update "$SCOPE" --force
    if [[ -n "${OLLAMA_BASE_URL:-}${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}${OPENAI_API_KEY:-}${ANTHROPIC_API_KEY:-}${MOONSHOT_API_KEY:-}${DEEPSEEK_API_KEY:-}" ]]; then
      run_graphify cluster-only "$SCOPE" --backend "${GRAPHIFY_BACKEND:-ollama}"
    else
      run_graphify cluster-only "$SCOPE"
    fi
    ;;
  deep)
    check_local_llm
    export OLLAMA_BASE_URL="$LM_STUDIO_URL"
    export OLLAMA_MODEL="$LM_STUDIO_MODEL"
    export OLLAMA_API_KEY="${OLLAMA_API_KEY:-lm-studio}"
    run_graphify extract "$SCOPE" \
      --backend "${GRAPHIFY_BACKEND:-ollama}" \
      --mode deep \
      --max-concurrency "${GRAPHIFY_MAX_CONCURRENCY:-1}" \
      --api-timeout "${GRAPHIFY_API_TIMEOUT:-900}"
    run_graphify cluster-only "$SCOPE" --backend "${GRAPHIFY_BACKEND:-ollama}"
    ;;
  *)
    echo "Usage: $0 [ast|label|deep]" >&2
    exit 2
    ;;
esac

mkdir -p graphify-out/cache
cp "$SCOPE/graphify-out/graph.json" graphify-out/graph.json
cp "$SCOPE/graphify-out/graph.html" graphify-out/graph.html
cp "$SCOPE/graphify-out/GRAPH_REPORT.md" graphify-out/GRAPH_REPORT.md
if [[ -f "$SCOPE/graphify-out/cache/stat-index.json" ]]; then
  cp "$SCOPE/graphify-out/cache/stat-index.json" graphify-out/cache/stat-index.json
fi
if [[ -f "$SCOPE/graphify-out/.graphify_analysis.json" ]]; then
  cp "$SCOPE/graphify-out/.graphify_analysis.json" graphify-out/.graphify_analysis.json
fi

python3 - <<'PY'
import hashlib
import json
from pathlib import Path

root = Path.cwd()
graph = json.loads(Path("graphify-out/graph.json").read_text())
files = sorted({
    node.get("source_file")
    for node in graph.get("nodes", [])
    if node.get("source_file")
})
manifest = {}
for rel in files:
    src = root / rel
    if not src.exists():
        continue
    data = src.read_bytes()
    digest = hashlib.md5(data).hexdigest()
    manifest[str(src)] = {
        "mtime": src.stat().st_mtime,
        "ast_hash": digest,
        "semantic_hash": digest,
    }
Path("graphify-out/manifest.json").write_text(
    json.dumps(manifest, indent=2, sort_keys=True),
    encoding="utf-8",
)
print(f"[graphify] manifest indexed {len(manifest)} source files")
PY

python3 - <<'PY'
from pathlib import Path

report = Path("graphify-out/GRAPH_REPORT.md")
text = report.read_text()
first = text.splitlines()[0] if text else ""
if "/private/tmp/" in first or "wastegrab-graphify-scope" in first:
    lines = text.splitlines()
    lines[0] = "# Graph Report - WasteGrab focused code graph  (2026-06-02)"
    text = "\n".join(lines) + "\n"
text = text.replace(
    "Run `graphify update .` after code changes (no API cost).",
    "Run `tools/graphify/update-codebase-graphify.sh ast|label|deep` after code changes; do not run `graphify update .` from the repo root.",
)
report.write_text(text)
PY

python3 - <<'PY'
import json
from pathlib import Path

graph = json.loads(Path("graphify-out/graph.json").read_text())
print(
    f"[graphify] graph indexed {len(graph.get('nodes', []))} nodes, "
    f"{len(graph.get('links', []))} edges"
)
PY
