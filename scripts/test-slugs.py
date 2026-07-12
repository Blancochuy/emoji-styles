#!/usr/bin/env python3
"""Test emoji slug mapping from emoji-datasource to CDN URLs."""
import json
import urllib.request
import subprocess

data = json.loads(urllib.request.urlopen("https://unpkg.com/emoji-datasource@15.1.0/emoji.json").read())

tested = 0
matched = 0
for e in data[:50]:
    if e["category"] == "Component" or e["subcategory"] == "keycap":
        continue
    
    short = e["short_name"].replace("_", "-")
    unified = e["unified"].split("-")[0].lower()
    cdn_name = short + "_" + unified
    
    url = f"https://em-content.zobj.net/source/microsoft-teams/400/{cdn_name}.png"
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url], capture_output=True, text=True)
    code = r.stdout.strip()
    
    tested += 1
    status = "OK" if code == "200" else f"FAIL({code})"
    print(f"  {status:10s} {e['short_name']:25s} -> {cdn_name}")
    if code == "200":
        matched += 1

print(f"\nResult: {matched}/{tested} matched")
