#!/usr/bin/env python3
"""Scrape Emojipedia to find the actual image filenames."""
import urllib.request
import re

emojis_to_check = ["rocket", "fire", "waving-hand", "star", "trophy", "light-bulb", "check-mark-button", "grinning-face"]

for slug in emojis_to_check:
    url = f"https://emojipedia.org/{slug}/"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=10).read().decode()
        # Find ALL image references
        imgs = re.findall(r'src="([^"]*(?:\.png|\.gif|\.svg)[^"]*)"', html)
        # Also find data-src (lazy loaded)
        data_imgs = re.findall(r'data-src="([^"]*(?:\.png|\.gif|\.svg)[^"]*)"', html)
        all_imgs = imgs + data_imgs
        # Filter to emoji-related images
        emoji_imgs = [i for i in all_imgs if "emoji" in i.lower() or "zobj" in i.lower() or "72x72" in i.lower()]
        if emoji_imgs:
            print(f"{slug:25s} → {emoji_imgs[0]}")
        elif all_imgs:
            print(f"{slug:25s} → {all_imgs[0][:80]}")
        else:
            print(f"{slug:25s} → NO IMAGES FOUND")
    except Exception as e:
        print(f"{slug:25s} → ERROR: {e}")
