# Twemoji 15.1.0 asset report

Snapshot generated from the configured jdecked/twemoji 15.1.0 source for the current Emoji Styles catalog.

| Metric | Result |
| --- | ---: |
| Twemoji 15.1 RGI entries | 3,782 |
| Verified local assets | 3,782 |
| Download failures | 0 |
| PNG payload | 3,519,834 bytes |
| Manifest | 1,494,786 bytes |
| Complete package snapshot | 5,014,620 bytes |
| Lossless recompression wins | 0 |

The upstream PNG files were already smaller than or equal to every lossless candidate, so the package preserves all 3,782 images byte-for-byte. The sync pipeline follows Twemoji's variation-selector filename rules, including ZWJ sequences, and reuses files whose manifest hashes are still valid.

Every file is recorded in `packages/assets-twemoji/public/emoji/twemoji/15.1.0/manifest.json` with its SHA-256 checksum. Package tests read every committed asset and verify it against the manifest.
