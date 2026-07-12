# Twemoji 15.1.0 asset report

Snapshot generated from the configured jdecked/twemoji 15.1.0 source for the current Emoji Styles catalog.

| Metric | Result |
| --- | ---: |
| Catalog entries | 893 |
| Unique normalized assets | 892 |
| Download failures | 0 |
| PNG payload | 792,787 bytes |
| Manifest | 333,566 bytes |
| Complete package snapshot | 1,126,353 bytes |
| Lossless recompression wins | 0 |

The upstream PNG files were already smaller than or equal to every lossless candidate, so the package preserves all 892 images byte-for-byte. Git LFS and a dedicated CDN are not justified at this size.

Every file is recorded in `packages/assets-twemoji/public/emoji/twemoji/15.1.0/manifest.json` with its SHA-256 checksum. Package tests read every committed asset and verify it against the manifest.
