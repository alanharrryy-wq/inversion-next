import os, json, glob, math, sys
from datetime import datetime

def _ensure_pillow():
  try:
    from PIL import Image  # noqa
    return True
  except Exception:
    return False

def _install_pillow():
  import subprocess
  subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])

def load_images(folder):
  from PIL import Image
  files = sorted(glob.glob(os.path.join(folder, "shot_*.png")))
  imgs = []
  for f in files:
    img = Image.open(f).convert("RGB")
    imgs.append((f, img))
  return imgs

def diff_score(imgA, imgB, thresh=8):
  # returns: mean_abs_diff_per_channel, pct_pixels_over_thresh
  import numpy as np
  a = np.array(imgA, dtype=np.int16)
  b = np.array(imgB, dtype=np.int16)
  d = np.abs(a - b)  # HxWx3
  mean = float(d.mean())
  # pixel is "changed" if any channel exceeds thresh
  changed = (d.max(axis=2) > thresh)
  pct = float(changed.mean()) * 100.0
  return mean, pct

def main():
  out_dir = os.environ.get("HI_FLICKER_OUT", os.path.join("tools", "mcp", "_flicker_out"))
  report_path = os.path.join(out_dir, "flicker_report.json")

  if not os.path.isdir(out_dir):
    print("No output dir:", out_dir)
    sys.exit(1)

  if not _ensure_pillow():
    print("Installing Pillow...")
    _install_pillow()

  from PIL import Image  # noqa
  import numpy as np  # noqa

  imgs = load_images(out_dir)
  if len(imgs) < 2:
    print("Need at least 2 screenshots in", out_dir)
    sys.exit(2)

  pairs = []
  for i in range(len(imgs) - 1):
    f1, im1 = imgs[i]
    f2, im2 = imgs[i + 1]
    mean, pct = diff_score(im1, im2)
    pairs.append({
      "pair": [os.path.basename(f1), os.path.basename(f2)],
      "mean_abs_diff": mean,
      "pct_pixels_changed_over_thresh": pct
    })

  max_mean = max(p["mean_abs_diff"] for p in pairs)
  max_pct = max(p["pct_pixels_changed_over_thresh"] for p in pairs)
  avg_mean = sum(p["mean_abs_diff"] for p in pairs) / len(pairs)
  avg_pct = sum(p["pct_pixels_changed_over_thresh"] for p in pairs) / len(pairs)

  # Heuristics: tune as needed
  # - If a lot of pixels change frame-to-frame or mean diff high => flicker
  verdict = "stable"
  if max_pct > 0.25 or max_mean > 1.5:
    verdict = "flicker_likely"
  if max_pct > 1.0 or max_mean > 4.0:
    verdict = "flicker_confirmed"

  report = {
    "time": datetime.utcnow().isoformat() + "Z",
    "out_dir": os.path.abspath(out_dir),
    "frames": len(imgs),
    "pairs": len(pairs),
    "summary": {
      "avg_mean_abs_diff": avg_mean,
      "max_mean_abs_diff": max_mean,
      "avg_pct_pixels_changed_over_thresh": avg_pct,
      "max_pct_pixels_changed_over_thresh": max_pct,
      "verdict": verdict
    },
    "details": pairs
  }

  with open(report_path, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)

  print("REPORT:", report_path)
  print("VERDICT:", verdict)
  print("MAX_PCT_CHANGED:", round(max_pct, 4), "%")
  print("MAX_MEAN_DIFF:", round(max_mean, 4))

if __name__ == "__main__":
  main()
