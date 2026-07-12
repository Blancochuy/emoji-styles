#!/usr/bin/env python3
"""Scrape Emojipedia to find the CDN filename pattern."""
import urllib.request
import re

emojis_to_check = ["rocket", "fire", "waving-hand", "star", "trophy", "light-bulb", "check-mark-button"]

for slug in emojis_to_check:
    url = f"https://emojipedia.org/{slug}/"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=10).read().decode()
        # Find CDN URLs
        cdn_refs = re.findall(r'em-content\.zobj\.net/source/[^/]+/\d+/([^"]+\.png)', html)
        if cdn_refs:
            print(f"{slug:25s} → {cdn_refs[0]}")
        else:
            print(f"{slug:25s} → NO CDN REF FOUND")
    except Exception as e:
        print(f"{slug:25s} → ERROR: {e}")
