"""Regenerate the raster brand assets in public/.

    public/og.png        1200x630 social preview, screenshotted from /dev/og
    public/icon-192.png  app icons, rendered from public/icon.svg
    public/icon-512.png

Needs the dev server running and Python Playwright with Chromium:

    npm run dev
    pip install playwright
    python -m playwright install chromium
    python scripts/render-brand-assets.py http://localhost:3000
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"


def main() -> None:
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
    icon_svg = (PUBLIC / "icon.svg").read_text(encoding="utf-8")

    with sync_playwright() as p:
        browser = p.chromium.launch()

        page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        page.goto(f"{base}/dev/og", wait_until="networkidle")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(600)
        # Hide the Next.js dev indicator so it is not baked into the image.
        page.add_style_tag(content="nextjs-portal{display:none!important}")
        page.screenshot(path=str(PUBLIC / "og.png"), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
        page.close()

        for size in (192, 512):
            page = browser.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
            page.set_content(
                f"<style>html,body{{margin:0}}svg{{display:block;width:{size}px;height:{size}px}}</style>{icon_svg}"
            )
            page.screenshot(path=str(PUBLIC / f"icon-{size}.png"))
            page.close()

        browser.close()
    print("Wrote og.png, icon-192.png, icon-512.png")


if __name__ == "__main__":
    main()
