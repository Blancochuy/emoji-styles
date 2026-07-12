# Asset licensing policy

The MIT license in `LICENSE` covers the source code created for this repository. It does not grant rights to third-party emoji artwork.

## Distribution policy

- All workspace packages remain marked `private` until the public package boundary and third-party notices are reviewed.
- A public build may expose only providers listed in `publicProviders`.
- `experimentalProviders` are for internal evaluation and documentation previews only. They must not be bundled, mirrored, or advertised as licensed for production.
- New asset sets require a source URL, exact version, license identifier, attribution text, and a record of any modifications.
- Open assets should be fetched from their official upstream release, verified by checksum, and hosted in a versioned location controlled by the project.
- Apple, Samsung, or other proprietary artwork requires written permission before public distribution.

## Code review checklist

1. Is the artwork license explicit and applicable to the exact files?
2. Does it permit redistribution and commercial use?
3. Are attribution and notice requirements included in `THIRD_PARTY_NOTICES.md`?
4. Is the upstream version immutable and reproducible?
5. Does the package avoid implying vendor endorsement?

This policy is operational guidance, not legal advice.
