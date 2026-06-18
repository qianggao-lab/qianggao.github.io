#!/usr/bin/env python3
"""Fetch Google Scholar citation metrics and write assets/data/scholar.json.

Standard-library only (no pip installs). Degrades gracefully: on any failure
(network error, CAPTCHA, layout change) it leaves the existing JSON untouched and
exits 0, so the website keeps showing the last known-good values and the daily
workflow doesn't spam failure emails.
"""

import datetime
import json
import os
import re
import sys
import urllib.request

SCHOLAR_ID = "219Iw04AAAAJ"
URL = f"https://scholar.google.com/citations?user={SCHOLAR_ID}&hl=en"

# Resolve output path relative to this script so cwd doesn't matter.
OUT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "assets", "data", "scholar.json")
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def skip(message):
    """Log a warning and exit without touching the JSON file."""
    print(f"::warning::{message} — leaving scholar.json unchanged.")
    sys.exit(0)


def main():
    req = urllib.request.Request(URL, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8", "replace")
    except Exception as exc:  # noqa: BLE001 - any failure should degrade gracefully
        skip(f"request failed: {exc}")

    if "gsc_rsb_std" not in html:
        skip("metrics table not found (likely a CAPTCHA or temporary block)")

    # The metrics table lists, in order: citations(all), citations(since),
    # h-index(all), h-index(since), i10-index(all), i10-index(since).
    nums = re.findall(r'<td class="gsc_rsb_std">\s*(\d+)\s*</td>', html)
    if len(nums) < 5:
        skip(f"unexpected metrics format (found {len(nums)} values)")

    citedby, hindex, i10index = int(nums[0]), int(nums[2]), int(nums[4])

    name_match = re.search(r'id="gsc_prf_in">([^<]+)<', html)
    name = name_match.group(1).strip() if name_match else "Qiang Gao"

    data = {
        "name": name,
        "citedby": citedby,
        "hindex": hindex,
        "i10index": i10index,
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
        "url": URL,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Updated {OUT}: {data}")


if __name__ == "__main__":
    main()
