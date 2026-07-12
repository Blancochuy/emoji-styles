#!/usr/bin/env python3
"""Find the actual emoji image URLs on Emojipedia pages."""
import urllib.request
import re

url = "https://emojipedia.org/rocket/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=10).read().decode()

# Find all URLs in the page
all_urls = re.findall(r'https?://[^\s"\'<>]+', html)

# Filter to interesting ones
for u in all_urls:
    if "zobj" in u or "emoji" in u.lower() or "72x72" in u or "microsoft" in u.lower():
        print(u[:120])

print("\n--- All unique domains ---")
domains = set()
for u in all_urls:
    m = re.match(r'https?://([^/]+)', u)
    if m:
        domains.add(m.group(1))
for d in sorted(domains):
    print(f"  {d}")
