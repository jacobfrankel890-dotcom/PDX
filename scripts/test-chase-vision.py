#!/usr/bin/env python3
"""Test Chase PDF vision strip parsing against analyze-statement edge function."""
import base64
import io
import json
import sys
import urllib.request

import fitz  # pymupdf

PDF = "/Users/jacobfrankel/Desktop/Chase ink ending 05.20.26.pdf"
URL = "https://fubgrrthbqdgxvggccwk.supabase.co/functions/v1/analyze-statement"
ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1YmdycnRoYnFkZ3h2Z2djY3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzQxNDIsImV4cCI6MjA5NjUxMDE0Mn0."
    "_S54tw8MhvkHgkna2OoWbT-inklblikZV2rH__zvOjE"
)
TARGET = 5531.92
STRIPS = 4
SCALE = 4


def render_jpeg(page, clip=None, zoom=SCALE):
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    return base64.b64encode(pix.tobytes("jpeg", jpg_quality=90)).decode("ascii")


def pdf_to_vision_images(path, strips_per_activity=STRIPS):
    doc = fitz.open(path)
    images = []
    if doc.page_count >= 1:
        images.append(render_jpeg(doc[0]))
    for p in range(1, doc.page_count):
        page = doc[p]
        rect = page.rect
        h, w = rect.height, rect.width
        strip_h = h / strips_per_activity
        overlap = strip_h * 0.15
        for s in range(strips_per_activity):
            y0 = max(0, s * strip_h - (overlap if s > 0 else 0))
            y1 = min(h, y0 + strip_h + (overlap if s > 0 else 0))
            clip = fitz.Rect(0, y0, w, y1)
            images.append(render_jpeg(page, clip=clip))
    return images, doc.page_count


def main():
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else PDF
    print(f"Rendering {pdf_path} …")
    images, page_count = pdf_to_vision_images(pdf_path)
    print(f"  {page_count} page(s), {len(images)} vision image(s) (1 summary + {len(images)-1} strips)")

    body = {
        "pageImages": images,
        "pdfPageCount": page_count,
        "visionLayout": "summary_strips",
        "targetTotal": TARGET,
        "mimeType": "application/pdf",
        "fileName": pdf_path.split("/")[-1],
    }

    print("Calling analyze-statement (may take 2–4 min) …")
    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {ANON}",
            "apikey": ANON,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        data = json.loads(resp.read())

    if not data.get("ok"):
        print("ERROR:", data.get("error", data))
        sys.exit(1)

    txns = data.get("transactions") or []
    total = sum(t.get("amount", 0) for t in txns)
    print(f"\nSource: {data.get('parse_source', '?')}")
    print(f"Period: {data.get('period_start')} – {data.get('period_end')}")
    print(f"Purchases total (parsed): ${data.get('purchases_total', 0):,.2f}")
    print(f"Charges: {len(txns)} rows, sum ${total:,.2f}")
    print(f"Target: ${TARGET:,.2f}, gap ${TARGET - total:,.2f}")

    credits = [t for t in txns if "CONCENTRA" in (t.get("merchant") or "").upper()]
    if credits:
        print(f"\nCONCENTRA rows ({len(credits)}):")
        for t in credits:
            print(f"  {t.get('date')} {t.get('merchant')} ${t.get('amount')}")

    neg_like = [t for t in txns if t.get("amount", 0) < 0]
    if neg_like:
        print(f"\nWARNING: {len(neg_like)} negative amounts still present")

    print("\nFirst 5 / last 5 charges:")
    for t in txns[:5]:
        print(f"  {t.get('date')} | {t.get('merchant', '')[:40]} | ${t.get('amount')}")
    if len(txns) > 10:
        print("  …")
        for t in txns[-5:]:
            print(f"  {t.get('date')} | {t.get('merchant', '')[:40]} | ${t.get('amount')}")


if __name__ == "__main__":
    main()
