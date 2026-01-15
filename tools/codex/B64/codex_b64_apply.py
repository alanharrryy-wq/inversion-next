from __future__ import annotations

import argparse
import re
from pathlib import Path

from codex_b64_lib import (
    CodexB64Error,
    PartialChunksError,
    is_path_within,
    parse_b64_chunks,
    safe_write_bytes,
    sha256_file,
)


DEFAULT_B64_DIR = r"F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\HITECH_AISTUDIO_SYSTEM\PS1s\B64"
DEFAULT_REPO_DIR = r"F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\repos\inversion-next"
DEFAULT_TARGET_FILE = r"F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\repos\inversion-next\git-push.ps1"

RUN_RE = re.compile(r"^git-push_b64_run_(\d{4})\.txt$", re.IGNORECASE)


def find_latest_run_file(b64_dir: Path) -> Path:
    best_n = -1
    best_p = None
    if not b64_dir.exists():
        raise FileNotFoundError("B64_DIR not found: {0}".format(b64_dir))
    for p in b64_dir.iterdir():
        if not p.is_file():
            continue
        m = RUN_RE.match(p.name)
        if not m:
            continue
        n = int(m.group(1))
        if n > best_n:
            best_n = n
            best_p = p
    if best_p is None:
        raise FileNotFoundError("No git-push_b64_run_*.txt found in {0}".format(b64_dir))
    return best_p


def main() -> int:
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("--b64-dir", default=DEFAULT_B64_DIR)
    ap.add_argument("--repo-dir", default=DEFAULT_REPO_DIR)
    ap.add_argument("--target-file", default=DEFAULT_TARGET_FILE)
    ap.add_argument("--input-path", default="")
    ap.add_argument("--allow-partial", action="store_true")
    args = ap.parse_args()

    b64_dir = Path(args.b64_dir)
    repo_dir = Path(args.repo_dir)
    target_file = Path(args.target_file)

    default_target = Path(DEFAULT_TARGET_FILE)

    # Guardrail: jamás escribir dentro del repo salvo git-push.ps1
    try:
        if is_path_within(target_file, repo_dir) and target_file.resolve() != default_target.resolve():
            raise CodexB64Error("Refusing to write into REPO_DIR except git-push.ps1.")
    except Exception:
        if is_path_within(target_file, repo_dir) and str(target_file).lower() != str(default_target).lower():
            raise CodexB64Error("Refusing to write into REPO_DIR except git-push.ps1.")

    if args.input_path:
        inp = Path(args.input_path)
    else:
        inp = find_latest_run_file(b64_dir)

    text = inp.read_text(encoding="utf-8", errors="replace")

    try:
        _file_name, decoded, _total_chunks = parse_b64_chunks(text, allow_partial=args.allow_partial)
    except PartialChunksError as e:
        raise CodexB64Error(str(e))
    except CodexB64Error:
        raise
    except Exception as e:
        raise CodexB64Error("Parse failed: {0}".format(e))

    # Write atómico: temp en B64_DIR y replace al target (sin ensuciar el repo con temp files)
    safe_write_bytes(target_file, decoded, temp_dir=b64_dir)

    out_sha = sha256_file(target_file)

    print("APPLIED_FROM: {0}".format(inp))
    print("OUTPUT_PATH: {0}".format(target_file))
    print("OUTPUT_SHA256: {0}".format(out_sha))
    print("DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
