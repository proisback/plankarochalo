"""Record the real product being used, for the landing page.

Drives the live demo (join, dates, vote, hold to commit, ticket) in a phone-sized
browser and saves a short muted video plus a poster frame:

    public/demo-walkthrough.mp4
    public/demo-walkthrough.jpg

Frames are taken as 2x screenshots and stitched with their real timings. A
browser screen recording would be smoother but is captured at 1x and looks soft.

    npm run dev
    python scripts/record-demo.py http://localhost:3000

Needs Python Playwright with Chromium, and ffmpeg on PATH.
"""
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
W, H = 390, 760


def main() -> None:
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
    theme = sys.argv[2] if len(sys.argv) > 2 else "light"
    work = Path(tempfile.mkdtemp(prefix="pkc-rec-"))
    frames: list[tuple[float, Path]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": W, "height": H},
            device_scale_factor=2,
            color_scheme=theme,
            has_touch=True,
            is_mobile=True,
        )
        page = ctx.new_page()
        page.goto(f"{base}/demo", wait_until="networkidle")
        # The recording shows the product, not the demo controls or dev tooling.
        page.add_style_tag(content="nextjs-portal,[data-demo-bar]{display:none!important}")
        page.get_by_label("Your name").wait_for(timeout=15000)
        page.wait_for_timeout(500)
        start = time.monotonic()

        def pause(seconds: float) -> None:
            """Wait, capturing frames the whole time."""
            end = time.monotonic() + seconds
            while True:
                path = work / f"f{len(frames):05d}.jpg"
                page.screenshot(path=str(path), type="jpeg", quality=88)
                frames.append((time.monotonic() - start, path))
                if time.monotonic() >= end:
                    break

        def scroll(to_y: int, seconds: float = 0.7) -> None:
            page.evaluate(f"window.scrollTo({{top: {to_y}, behavior: 'smooth'}})")
            pause(seconds)

        pause(0.6)
        page.get_by_label("Your name").press_sequentially("Aanya", delay=110)
        pause(0.5)
        page.get_by_role("button", name=re.compile("Add my dates")).click()
        page.get_by_role("heading", name=re.compile("when are you free", re.I)).wait_for(timeout=15000)
        pause(1.0)

        best = page.locator('button[aria-pressed][aria-label*="best" i]:not([disabled])')
        y = best.first.evaluate("el => el.getBoundingClientRect().top + window.scrollY")
        scroll(int(y) - 330)
        for i in range(min(best.count(), 3)):
            best.nth(i).click()
            pause(0.4)
        pause(0.5)
        page.get_by_role("button", name=re.compile(r"Save \d+ (date|day)", re.I)).click()
        pause(1.3)
        scroll(0)
        pause(1.2)

        # Dev answers last; the stage locks by itself and Place opens.
        page.get_by_role("heading", name=re.compile("where to", re.I)).wait_for(timeout=25000)
        pause(0.8)
        scroll(240)
        pause(6.6)  # friends vote live
        page.get_by_role("button", name=re.compile(r"^\s*Goa", re.I)).first.click()
        pause(1.4)

        page.get_by_role("heading", name=re.compile("are you in", re.I)).wait_for(timeout=25000)
        pause(0.9)
        btn = page.get_by_role("button", name=re.compile("in", re.I)).filter(has_text=re.compile("hold", re.I)).first
        y = btn.evaluate("el => el.getBoundingClientRect().top + window.scrollY")
        scroll(int(y) - 380)
        box = btn.bounding_box()
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        page.mouse.down()
        pause(2.4)
        page.mouse.up()
        pause(1.4)

        page.get_by_text(re.compile("Chart prepared", re.I)).first.wait_for(timeout=25000)
        pause(0.9)
        y = page.get_by_role("article", name=re.compile("Trip ticket", re.I)).evaluate(
            "el => el.getBoundingClientRect().top + window.scrollY"
        )
        scroll(int(y) - 64, 0.9)
        pause(3.0)
        poster = frames[-1][1]
        ctx.close()
        browser.close()

    # Each frame is shown for as long as it really lasted.
    concat = work / "frames.txt"
    lines = []
    for i, (t, path) in enumerate(frames):
        nxt = frames[i + 1][0] if i + 1 < len(frames) else t + 0.5
        lines.append(f"file '{path.as_posix()}'")
        lines.append(f"duration {max(nxt - t, 0.02):.4f}")
    lines.append(f"file '{frames[-1][1].as_posix()}'")
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

    out = PUBLIC / "demo-walkthrough.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", "fps=24,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "26",
            "-movflags", "+faststart", "-an", str(out),
        ],
        check=True,
    )
    shutil.copyfile(poster, PUBLIC / "demo-walkthrough.jpg")
    print(f"{len(frames)} frames over {frames[-1][0]:.1f}s ({len(frames) / frames[-1][0]:.1f} fps captured)")
    shutil.rmtree(work, ignore_errors=True)
    print(f"Wrote {out.name} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
