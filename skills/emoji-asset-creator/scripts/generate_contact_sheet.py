#!/usr/bin/env python3
"""Preview or create a review-only contact sheet."""

from __future__ import annotations

import argparse
from _cli import approval_flags, run_cli


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--columns", type=int, default=6)
    parser.add_argument("--tile-size", type=int, default=160)
    parser.add_argument("--review", action="store_true", help="Show 24/48/96px previews on light and dark backgrounds")
    parser.add_argument("--yes", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    return run_cli(["assets", "contact-sheet", args.input, args.output, "--columns", str(args.columns), "--tile-size", str(args.tile_size), *(["--review"] if args.review else []), *approval_flags(args)])


if __name__ == "__main__":
    raise SystemExit(main())
