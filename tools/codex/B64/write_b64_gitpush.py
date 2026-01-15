#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import base64
import hashlib
import os
import re
import sys
from pathlib import Path
from datetime import datetime

RUN_RE = re.compile(r"^git-push_b64_run_(\d{4})\.txt$", re.IGNORECASE)

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest().upper()

def next_run_number(b64_dir: Path) -> int:
    max_n = 0
    for p in b64_dir.iterdir():
        if not p.is_file():
            continue
        m = RUN_RE.match(p.name)
        if not m:
            continue
        n = int(m.group(1))
        if n > max_n:
            max_n = n
    return max_n + 1 if max_n > 0 else 1

def chunk_string(s: str, chunk_chars: int):
    # chunk_chars is count of base64 characters per chunk
    for i in range(0, len(s), chunk_chars):
        yield s[i:i + chunk_chars]

def main():
    if len(sys.argv) < 3:
        print("Usage: write_b64_gitpush.py <repo_dir> <b64_dir> [chunk_kb_min] [chunk_kb_max]", file=sys.stderr)
        return 2

    repo_dir = Path(sys.argv[1]).resolve()
    b64_dir = Path(sys.argv[2]).resolve()

    # Optional: allow caller to influence chunk size; defaults tuned for stream reliability
    chunk_kb_min = int(sys.argv[3]) if len(sys.argv) >= 4 else 40
    chunk_kb_max = int(sys.argv[4]) if len(sys.argv) >= 5 else 80

    if chunk_kb_min <= 0 or chunk_kb_max <= 0 or chunk_kb_min > chunk_kb_max:
        print("Invalid chunk KB range. Provide e.g. 40 80.", file=sys.stderr)
        return 2

    git_push_path = repo_dir / "git-push.ps1"
    if not git_push_path.exists():
        print(f"ERROR: git-push.ps1 not found at: {git_push_path}", file=sys.stderr)
        return 1

    b64_dir.mkdir(parents=True, exist_ok=True)

    run_n = next_run_number(b64_dir)
    out_path = b64_dir / f"git-push_b64_run_{run_n:04d}.txt"

    # Read bytes and base64 encode (UTF-8 bytes requirement is satisfied by reading raw bytes;
    # if file is text UTF-8, bytes are correct as stored)
    data = git_push_path.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")

    # Choose a chunk size in characters roughly corresponding to KB range
    # base64 expands by 4/3; 1 KB approx 1024 chars for ascii lines (rough)
    # We'll pick mid-point of min/max.
    target_kb = (chunk_kb_min + chunk_kb_max) // 2
    chunk_chars = target_kb * 1024

    # Write with markers
    total_chunks = (len(b64) + chunk_chars - 1) // chunk_chars
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with out_path.open("w", encoding="utf-8", newline="\n") as f:
        f.write("### BEGIN B64 FILE: git-push.ps1\n")
        f.write(f"### META NOW: {now}\n")
        f.write(f"### META SOURCE: {git_push_path.as_posix()}\n")
        f.write(f"### META BYTES: {len(data)}\n")
        for idx, part in enumerate(chunk_string(b64, chunk_chars), start=1):
            f.write(f"### BEGIN B64 CHUNK {idx}/{total_chunks}\n")
            f.write(part)
            f.write("\n")
            f.write(f"### END B64 CHUNK {idx}/{total_chunks}\n")
        f.write("### END B64 FILE: git-push.ps1\n")

    txt_sha = sha256_file(out_path)

    # Minimal stdout summary (Codex-friendly)
    print(f"B64_OUTPUT_PATH: {out_path}")
    print(f"CHUNKS: {total_chunks}")
    print(f"TXT_SHA256: {txt_sha}")
    print("DONE")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
