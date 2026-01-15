from __future__ import annotations

import base64
import hashlib
import os
import re
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union


class CodexB64Error(Exception):
    pass


class PartialChunksError(CodexB64Error):
    def __init__(self, message: str, missing: List[int]):
        super().__init__(message)
        self.missing = missing


def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def is_path_within(child: Path, parent: Path) -> bool:
    try:
        child_resolved = child.resolve()
        parent_resolved = parent.resolve()
        return parent_resolved == child_resolved or parent_resolved in child_resolved.parents
    except Exception:
        parent_str = str(parent).rstrip("\\/") + os.sep
        child_str = str(child)
        return child_str.startswith(parent_str)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def find_next_run_number(
    prefix: str = "git-push_b64_run_",
    width: int = 4,
    directory: Optional[Union[str, Path]] = None,
    suffix: str = ".txt",
) -> int:
    if directory is None:
        directory = os.environ.get("CODEX_B64_DIR") or str(Path(__file__).parent)
    d = Path(str(directory))

    ensure_dir(d)

    pat = re.compile(
        r"^{0}(\d{{{1}}}){2}$".format(re.escape(prefix), width, re.escape(suffix)),
        re.IGNORECASE,
    )
    max_n = 0
    for p in d.iterdir():
        if not p.is_file():
            continue
        m = pat.match(p.name)
        if not m:
            continue
        try:
            n = int(m.group(1))
            if n > max_n:
                max_n = n
        except Exception:
            continue
    return max_n + 1


def sha256_bytes(data: bytes) -> str:
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()


def sha256_file(path: Union[str, Path]) -> str:
    p = Path(str(path))
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


_BEGIN_FILE_RE = re.compile(r"^\s*(?:###\s*)?BEGIN\s+B64\s+FILE:\s*(.+?)\s*$", re.IGNORECASE)
_END_FILE_RE = re.compile(r"^\s*(?:###\s*)?END\s+B64\s+FILE:\s*(.+?)\s*$", re.IGNORECASE)
_BEGIN_CHUNK_RE = re.compile(
    r"^\s*(?:###\s*)?BEGIN\s+B64\s+CHUNK\s+(\d+)\s*/\s*(\d+)\s*$",
    re.IGNORECASE,
)
_END_CHUNK_RE = re.compile(
    r"^\s*(?:###\s*)?END\s+B64\s+CHUNK\s+(\d+)\s*/\s*(\d+)\s*$",
    re.IGNORECASE,
)


def parse_b64_chunks(text: str, allow_partial: bool = False) -> Tuple[str, bytes, int]:
    text = _normalize_newlines(text)
    lines = text.split("\n")

    file_name = None  # type: Optional[str]
    end_file_seen = False

    expected_n = None  # type: Optional[int]
    chunk_data = {}  # type: Dict[int, str]

    in_chunk = False
    cur_i = None  # type: Optional[int]
    cur_n = None  # type: Optional[int]
    buf = []  # type: List[str]

    def flush_chunk() -> None:
        nonlocal in_chunk, cur_i, cur_n, buf
        if not in_chunk or cur_i is None or cur_n is None:
            return
        b64 = "".join(buf)
        b64 = re.sub(r"\s+", "", b64)
        if not b64:
            raise CodexB64Error("Chunk {0}/{1} is empty.".format(cur_i, cur_n))
        if cur_i in chunk_data:
            raise CodexB64Error("Duplicate chunk index {0}/{1}.".format(cur_i, cur_n))
        chunk_data[cur_i] = b64
        in_chunk = False
        cur_i = None
        cur_n = None
        buf = []

    for idx, line in enumerate(lines, start=1):
        if file_name is None:
            m = _BEGIN_FILE_RE.match(line)
            if m:
                file_name = m.group(1).strip()
                continue

        m = _END_FILE_RE.match(line)
        if m:
            end_file_seen = True
            flush_chunk()
            continue

        m = _BEGIN_CHUNK_RE.match(line)
        if m:
            if file_name is None:
                raise CodexB64Error("Found chunk marker before BEGIN B64 FILE.")
            if in_chunk:
                raise CodexB64Error("Nested chunk detected near line {0}.".format(idx))
            i = int(m.group(1))
            n = int(m.group(2))
            if expected_n is None:
                expected_n = n
            elif expected_n != n:
                raise CodexB64Error("Inconsistent total N: expected {0}, got {1}.".format(expected_n, n))
            in_chunk = True
            cur_i = i
            cur_n = n
            buf = []
            continue

        m = _END_CHUNK_RE.match(line)
        if m:
            if not in_chunk or cur_i is None or cur_n is None:
                raise CodexB64Error("END B64 CHUNK without matching BEGIN near line {0}.".format(idx))
            i = int(m.group(1))
            n = int(m.group(2))
            if i != cur_i or n != cur_n:
                raise CodexB64Error(
                    "Mismatched END marker near line {0}: got {1}/{2}, expected {3}/{4}.".format(
                        idx, i, n, cur_i, cur_n
                    )
                )
            flush_chunk()
            continue

        if in_chunk:
            buf.append(line)

    if in_chunk:
        raise CodexB64Error("Input ended mid-chunk (truncated stream).")

    if file_name is None:
        raise CodexB64Error("Missing BEGIN B64 FILE marker.")
    if expected_n is None:
        raise CodexB64Error("No chunks found (missing BEGIN B64 CHUNK markers).")
    if not end_file_seen:
        raise CodexB64Error("Missing END B64 FILE marker (truncated stream).")

    missing = [i for i in range(1, expected_n + 1) if i not in chunk_data]
    if missing:
        raise PartialChunksError("Missing chunks: {0}".format(", ".join(str(i) for i in missing)), missing=missing)

    b64_all = "".join(chunk_data[i] for i in range(1, expected_n + 1))

    try:
        decoded = base64.b64decode(b64_all.encode("ascii"), validate=True)
    except Exception:
        try:
            decoded = base64.b64decode(b64_all.encode("ascii"))
        except Exception as e2:
            raise CodexB64Error("Base64 decode failed: {0}".format(e2))

    return file_name, decoded, expected_n


def safe_write_text(
    path: Union[str, Path],
    text: str,
    encoding: str = "utf-8",
    newline: str = "\n",
    temp_dir: Optional[Union[str, Path]] = None,
) -> None:
    p = Path(str(path))
    ensure_dir(p.parent)
    text = _normalize_newlines(text).replace("\n", newline)

    tmp_parent = Path(str(temp_dir)) if temp_dir else p.parent
    ensure_dir(tmp_parent)

    fd, tmp_name = tempfile.mkstemp(prefix=".tmp_", suffix=".txt", dir=str(tmp_parent))
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding=encoding, newline="\n") as f:
            f.write(text)
        os.replace(str(tmp_path), str(p))
    finally:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass


def safe_write_bytes(
    path: Union[str, Path],
    data: bytes,
    temp_dir: Optional[Union[str, Path]] = None,
) -> None:
    p = Path(str(path))
    ensure_dir(p.parent)

    tmp_parent = Path(str(temp_dir)) if temp_dir else p.parent
    ensure_dir(tmp_parent)

    fd, tmp_name = tempfile.mkstemp(prefix=".tmp_", suffix=".bin", dir=str(tmp_parent))
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            try:
                os.fsync(f.fileno())
            except Exception:
                pass
        os.replace(str(tmp_path), str(p))
    finally:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass
