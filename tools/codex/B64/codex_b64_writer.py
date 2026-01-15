from __future__ import annotations

import argparse
import base64
import os
from pathlib import Path

from codex_b64_lib import find_next_run_number, safe_write_text, sha256_file


DEFAULT_B64_DIR = r"F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\HITECH_AISTUDIO_SYSTEM\PS1s\B64"
DEFAULT_REPO_DIR = r"F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\repos\inversion-next"
DEFAULT_TARGET_REL = "git-push.ps1"


def build_marked_text(file_name: str, b64_str: str, chunk_size: int):
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")

    chunks = [b64_str[i : i + chunk_size] for i in range(0, len(b64_str), chunk_size)]
    n = max(1, len(chunks))

    lines = []
    lines.append("BEGIN B64 FILE: {0}".format(file_name))
    for i, ch in enumerate(chunks, start=1):
        lines.append("BEGIN B64 CHUNK {0}/{1}".format(i, n))
        lines.append(ch)
        lines.append("END B64 CHUNK {0}/{1}".format(i, n))
    lines.append("END B64 FILE: {0}".format(file_name))
    lines.append("")
    return "\n".join(lines), n


def main() -> int:
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("--repo-dir", default=DEFAULT_REPO_DIR)
    ap.add_argument("--b64-dir", default=DEFAULT_B64_DIR)
    ap.add_argument("--file", default=DEFAULT_TARGET_REL, help="Path relative to repo, default git-push.ps1")
    ap.add_argument("--chunk-size", type=int, default=int(os.environ.get("CODEX_B64_CHUNK_SIZE", "65536")))
    args = ap.parse_args()

    repo_dir = Path(args.repo_dir)
    b64_dir = Path(args.b64_dir)
    input_path = repo_dir / args.file

    data = input_path.read_bytes()
    b64_str = base64.b64encode(data).decode("ascii")

    run_n = find_next_run_number(prefix="git-push_b64_run_", width=4, directory=b64_dir, suffix=".txt")
    out_name = "git-push_b64_run_{0:04d}.txt".format(run_n)
    out_path = b64_dir / out_name

    marked, n_chunks = build_marked_text(input_path.name, b64_str, args.chunk_size)
    safe_write_text(out_path, marked, encoding="utf-8", newline="\n", temp_dir=b64_dir)

    txt_sha = sha256_file(out_path)

    print("B64_OUTPUT_PATH: {0}".format(out_path))
    print("CHUNKS: {0}".format(n_chunks))
    print("TXT_SHA256: {0}".format(txt_sha))
    print("DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
