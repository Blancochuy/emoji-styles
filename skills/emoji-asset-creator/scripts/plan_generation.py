#!/usr/bin/env python3
"""Validate an asset specification and print a generation plan without spending or writing."""

from __future__ import annotations

import argparse
from _cli import run_cli


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec")
    parser.add_argument("--variants", type=int, choices=range(1, 5), default=1)
    args = parser.parse_args()
    return run_cli(["assets", "plan", args.spec, "--variants", str(args.variants), "--json"])


if __name__ == "__main__":
    raise SystemExit(main())
