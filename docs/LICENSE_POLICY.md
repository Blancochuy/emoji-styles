# Asset licensing policy

The MIT license in [`LICENSE`](../LICENSE) covers the source code created for this repository. It does not grant rights to third-party emoji artwork.

## Distribution policy

- All workspace packages remain marked `private` until the public package boundary and third-party notices are reviewed.
- A public build may expose only providers listed in `publicProviders`.
- New asset sets require a source URL, exact version, license identifier, attribution text, and a record of any modifications.
- Remote assets must resolve from an immutable upstream version. Bundled assets must also be verified by checksum.
- A licensed rolling endpoint may be exposed only as an explicit experimental opt-in, separated from `publicProviders` and documented as non-reproducible.
- Apple, Samsung, or other proprietary artwork requires written permission before public distribution.
- Native mode renders a user's installed system emoji font and does not redistribute artwork.

## Code review checklist

1. Is the artwork license explicit and applicable to the exact files?
2. Does it permit redistribution and commercial use?
3. Are attribution and notice requirements included in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)?
4. Is the upstream version immutable and reproducible?
5. Does the package avoid implying vendor endorsement?

This policy is operational guidance, not legal advice.
